package com.teamopensmartglasses.convoscope;

import androidx.annotation.NonNull;

import com.teamopensmartglasses.augmentoslib.AsrStreamType;

import java.util.Objects;

public class AsrStreamKey {
    public final AsrStreamType asrStreamType;
    public final String transcribeLanguage;
    public final String translateLanguage;

    public AsrStreamKey(AsrStreamType type, String transcribeLanguage, String translateLanguage) {
        this.asrStreamType = type;
        this.transcribeLanguage = transcribeLanguage;
        this.translateLanguage = translateLanguage;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AsrStreamKey that = (AsrStreamKey) o;
        return asrStreamType == that.asrStreamType &&
                Objects.equals(transcribeLanguage, that.transcribeLanguage) &&
                Objects.equals(translateLanguage, that.translateLanguage);
    }

    @Override
    public int hashCode() {
        return Objects.hash(asrStreamType, transcribeLanguage, translateLanguage);
    }

    @NonNull
    @Override
    public String toString() {
        return "AsrStreamKey{" +
                "asrStreamType=" + asrStreamType +
                ", transcribeLanguage='" + transcribeLanguage + '\'' +
                ", translateLanguage='" + translateLanguage + '\'' +
                '}';
    }
}