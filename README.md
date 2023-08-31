# Convoscope

Tools to augment conversations.

Convoscope augments conversations by providing language tools that run during your conversation, providing you with useful information, just-in-time.

It runs on smart glasses or earbuds for IRL conversations or on a laptop for meeting rooms and video calls.

## Features

- [Contextual Search Engine](https://medium.com/@caydenpierce4/the-future-of-search-engines-next-gen-conversations-through-contextual-search-2335d65019f5): Proactively answers questions before you ask, suggeuts relevant info, and mines insights during meetings and conversations.
    - Auto-Question answerer
    - Define rare words
    - Define relevant concepts and their relationships
    - Recall and share content you've seen before that is relevant
- ConvoTopics: Suggests questions to ask and topics to discuss.
- MindChunk: Live short term memory aid and running summary of your conversations.
- Conversation Visualization: See live charts of the semantic flow and structure of the conversation.
- FactChecker: Fact-checks your conversation in real-time.
- Memory Augmentation: Short term memory aids during conversations. Afterwards, ask questions about and get summaries of your conversations.

## Install/Setup

### Backend

See this guide: [Backend Setup Guide](./server/README.md)

### Frontend

See this guide: [Frontend Setup Guide](./web_frontend/README.md)

### Wearables

1. Install and run the [SmartGlassesManager](https://github.com/TeamOpenSmartGlasses/SmartGlassesManager).
2. Install and run the Convoscope Android app located in ./android_app
3. Start Convoscope using the SmartGlassesManager launcher.

### Building OGG/Orbis C++ for ASP

You only have to to follow these specific steps if you are building the OGG/Orbis C++ code. Otherwise, things will likely work with your regular Android Studio setup.

1. Run Linux (as you should be).
2. Install Java 17.
3. Ensure Java 17 is default Java (can set with `sudo update-java-alternatives`).
4. Run `chmod 777 ./gradle/` and `chmod 777 ./gradle/`.
5. Set your ANDROID_SDK_PATH WITH `export $ANDROID_SDK_PATH=<path to you Android>`.
6. Go into android folder and run `bash build_all.sh` to build everything.
7. If you get gradle version issues, install gradle 8.0.2: https://linuxhint.com/installing_gradle_ubuntu/ (follow the instructions, but replace 7.4.2 with 8.0.2).
8. Subsequent builds, you can just run `assembleDebug --stacktrace` to build the APK.
9. Install APK on phone (located in app/build/outputs/debug/).

## Team

#### People

- Cayden Pierce
- Alex Israelov
- Kenji Phang
- Nicolo Micheletti
- Jeremy Stairs
- Wazeer Zufikar
- Vaze
 
### Groups

- TeamOpenSmartGlasses
- MIT Media Lab
- TeamBandwidth

## License

MIT License
Copyright 2023 TeamOpenSmartGlasses
