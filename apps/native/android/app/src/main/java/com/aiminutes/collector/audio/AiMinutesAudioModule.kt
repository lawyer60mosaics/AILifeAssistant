package com.aiminutes.collector.audio

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

class AiMinutesAudioModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private val isRecording = AtomicBoolean(false)
  private var audioRecord: AudioRecord? = null
  private var worker: Thread? = null

  override fun getName(): String = "AiMinutesAudio"

  @ReactMethod
  fun start(promise: Promise) {
    if (isRecording.get()) {
      promise.resolve(true)
      return
    }

    if (reactContext.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      promise.reject("RECORD_AUDIO_DENIED", "Microphone permission has not been granted.")
      return
    }

    val sampleRate = 16000
    val channelConfig = AudioFormat.CHANNEL_IN_MONO
    val audioFormat = AudioFormat.ENCODING_PCM_16BIT
    val minBufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat)
    if (minBufferSize <= 0) {
      promise.reject("AUDIO_BUFFER_UNAVAILABLE", "Unable to allocate Android AudioRecord buffer.")
      return
    }

    val bufferSize = maxOf(minBufferSize, sampleRate / 2)
    val recorder = AudioRecord(
      MediaRecorder.AudioSource.VOICE_RECOGNITION,
      sampleRate,
      channelConfig,
      audioFormat,
      bufferSize
    )

    if (recorder.state != AudioRecord.STATE_INITIALIZED) {
      recorder.release()
      promise.reject("AUDIO_RECORD_INIT_FAILED", "Android AudioRecord failed to initialize.")
      return
    }

    audioRecord = recorder
    isRecording.set(true)
    recorder.startRecording()

    worker = thread(start = true, name = "ai-minutes-audio-record") {
      val buffer = ByteArray(bufferSize)
      while (isRecording.get()) {
        val read = recorder.read(buffer, 0, buffer.size)
        if (read > 0) {
          emitChunk(buffer, read, sampleRate)
        }
      }
    }

    promise.resolve(true)
  }

  @ReactMethod
  fun stop(promise: Promise) {
    stopRecorder()
    promise.resolve(true)
  }

  override fun invalidate() {
    stopRecorder()
    super.invalidate()
  }

  private fun stopRecorder() {
    if (!isRecording.getAndSet(false)) {
      return
    }

    worker?.join(800)
    worker = null

    audioRecord?.let { recorder ->
      runCatching { recorder.stop() }
      recorder.release()
    }
    audioRecord = null
  }

  private fun emitChunk(buffer: ByteArray, size: Int, sampleRate: Int) {
    val payload = Arguments.createMap()
    payload.putString("base64", Base64.encodeToString(buffer.copyOf(size), Base64.NO_WRAP))
    payload.putInt("sampleRate", sampleRate)
    payload.putInt("channels", 1)
    payload.putString("format", "pcm_s16le")

    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("AiMinutesAudioChunk", payload)
  }
}

