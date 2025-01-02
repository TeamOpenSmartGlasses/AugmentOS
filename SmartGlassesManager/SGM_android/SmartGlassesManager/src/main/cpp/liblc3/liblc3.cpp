#include <jni.h>
#include <string>
#include <cstdlib>
#include <cstdio>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include "include/lc3.h"
#include "include/rnnoise.h"
#include <android/log.h>


extern "C" JNIEXPORT jbyteArray JNICALL
Java_com_example_demo_1ai_1even_cpp_Cpp_decodeLC3(JNIEnv *env, jclass instance, jbyteArray lc3Data) {
//    __android_log_print(ANDROID_LOG_INFO, "cpp", "JNI decodeLC3 called!");
    jbyte *lc3Bytes = env->GetByteArrayElements(lc3Data, nullptr);
    int lc3Length = env->GetArrayLength(lc3Data);
    /*                      解码                           */
    //帧长10ms
    int dtUs = 10000;
    //采样率48K
    int srHz =16000;
    //单帧的采样数
    uint16_t sampleOfFrames = lc3_frame_samples(dtUs, srHz);
    //单帧字节数，16Bits下一个采样占用两个字节
    uint16_t bytesOfFrames = sampleOfFrames*2;

    //单帧编码后输出字节数
    uint16_t output_byte_count = 20;

    //输出帧缓冲
    auto *outBuf = (unsigned char *)malloc(bytesOfFrames);
    int outSize = (lc3Length/(int)output_byte_count) *(int)bytesOfFrames;
//    __android_log_print(ANDROID_LOG_INFO, "cpp", "lc3Length: %d,output_byte_count: %d bytesOfFrames: %d, outSize: %d,count: %d",lc3Length,output_byte_count, bytesOfFrames, outSize,((uint16_t)lc3Length/output_byte_count));

    // 创建新数组的内存
    unsigned char* outArray = (unsigned char*)malloc(outSize );

    unsigned decodeSize = lc3_decoder_size(dtUs, srHz);
    void* decMem = nullptr;
    decMem = malloc(decodeSize);
    lc3_decoder_t lc3_decoder = lc3_setup_decoder(dtUs, srHz, 0, decMem);

    jsize offset = 0;

    // 循环迭代，每次读取 40 个字节
    for (int i = 0; i <= lc3Length - output_byte_count; i += output_byte_count) {
        // 创建 unsigned char* 指针并指向数组的当前位置
        unsigned char* unsignedCharPtr = reinterpret_cast<unsigned char*>(lc3Bytes + i);
        // 使用 unsignedCharPtr 操作数据，例如打印或处理
        lc3_decode(lc3_decoder, unsignedCharPtr, output_byte_count, LC3_PCM_FORMAT_S16,outBuf, 1);
        // 处理 unsignedCharValue，进行其他操作
//        __android_log_print(ANDROID_LOG_INFO, "cpp", "offset: %d, outsize: %d", offset, outSize);
        memcpy(outArray + offset, outBuf, bytesOfFrames);
        offset += bytesOfFrames;

        memset(outBuf,0,bytesOfFrames);
    }
//    __android_log_print(ANDROID_LOG_INFO, "cpp", "outArray[0xC8]= %02X", outArray[0xC8]);
//    __android_log_print(ANDROID_LOG_INFO, "cpp", "for count: %d", lc3Length/output_byte_count);

    jbyteArray resultArray = env->NewByteArray( outSize);
    env->SetByteArrayRegion( resultArray, 0, outSize, (jbyte*)outArray);
    // 释放字节数组的指针
    env->ReleaseByteArrayElements( lc3Data, lc3Bytes, JNI_ABORT);
    free(decMem);
    free(outArray);
    free(outBuf);
    outBuf = NULL;
    return resultArray;
}


extern "C" JNIEXPORT jfloatArray JNICALL
Java_com_example_demo_1ai_1even_cpp_Cpp_rnNoise(JNIEnv *env, jclass clazz,jlong st, jfloatArray input) {
    jfloat *inputArray = env->GetFloatArrayElements(input, NULL);
//    jfloat *outputArray = env->GetFloatArrayElements(output, NULL);

//    __android_log_print(ANDROID_LOG_INFO, "cpp", "cc inputfloat: %f %f %f %f \n",inputArray[0],inputArray[1],inputArray[2],inputArray[3]);

    rnnoise_process_frame((DenoiseState*)st, inputArray, inputArray);
//    __android_log_print(ANDROID_LOG_INFO, "cpp", "cc outfloat: %f %f %f %f \n",inputArray[0],inputArray[1],inputArray[2],inputArray[3]);

    env->ReleaseFloatArrayElements(input, inputArray, 0);
    return input;
}

extern "C" JNIEXPORT jlong JNICALL
Java_com_example_demo_1ai_1even_cpp_Cpp_createRNNoiseState(JNIEnv *env, jclass clazz) {
    return (jlong) rnnoise_create(NULL);
}

extern "C" JNIEXPORT void JNICALL
Java_com_example_demo_1ai_1even_cpp_Cpp_destroyRNNoiseState(JNIEnv *env, jclass clazz, jlong st) {
    rnnoise_destroy((DenoiseState*) st);
}