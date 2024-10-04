package com.teamopensmartglasses.convoscope;

// A simple representation of combination of ll rare and ll upgrade
public class LLCombineResponseForStudy {
    private String inWord;
    private String inWordTranslation;

    LLCombineResponseForStudy(final String inWord, final String inWordTranslation) {
        this.inWord = inWord;
        this.inWordTranslation = inWordTranslation;
    }

    public String getInWord() {
        return inWord;
    }

    public String getInWordTranslation() {
        return inWordTranslation;
    }
}