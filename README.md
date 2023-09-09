# Convoscope

#### Smart glasses and web tools to augment conversations.

Convoscope answers your questions before you even ask. It does so by listening to your conversations and proactively providing useful definitions and insights to help you understand what is said, have better ideas, and more effectively solve problems. It runs on smart glasses for IRL conversations or on a laptop for meeting rooms and video calls.

[![Convoscope Demo video](./convoscope_play_video.jpg)](https://www.youtube.com/watch?v=3n6DzuYQ_v8 "Convoscope Demo")

### What Does It Do?

- Someone said a word you don't know? Instantly see a definition of that word.
- Mention of a politician you've never heard of? See their screenshot and summarised bio.
- Telling someone about a paper you read last night? The system automatically loads the paper summary and sends a reference to your conversation partner.
- Someone comes from a country you've never heard of? Instantly see it on a world map, along with description of the demographics, language, etc.
- Can't remember what your colleague said they are using for cloud services? The system searchers your past conversations and pulls up the answer as soon as you realise you need it.

### User Stories

Below are some hypothetical situations in which Convoscope could improve your conversations. Some of these already work in the current Convoscope app, and some are works in progress:

##### First Day at Your New Job

In a meeting with the CEO at your new job, she discusses doubling "MRR by end of Q2". Instantly, the smart glasses' contextual search clarifies "MRR" as "monthly recurring revenue" and "Q2" as "April — June". In mere seconds, your knowledge gaps are bridged, allowing you to stay engaged and informed.

##### Startup Venture Capitalist Discussion

During a startup pitch to a venture capitalist, you're questioned about how your solution compares to "X Inc.". Convoscope instantly identifies "X", showcases their logo to jog your memory, and pull up the relevant data from your competitive analysis spreadsheet. This allows you to respond with assuredness.

##### Child Psychology Discussion

While discussing your coworker's idea to pay their kids to practice piano, you mention relevant research on extrinsic vs. intrinsic rewards. Convoscope on your smart glasses swiftly retrieves your notes, summarizing key points. This refreshes your memory, enabling you to discuss the study's implications. With a simple gesture, you send the paper reference to your coworker for validation.

##### Environmental Symposium

Debating deforestation rates, an opponent argues that reforestation balances the losses. A pie chart pops up on your glasses, showing 80% deforestation vs. 20% reforestation globally. The tagline reads "Net Loss 60%." You counter by highlighting the vast difference between trees lost and replanted.

##### Tech Product Launch

At an expo, a competitor unveils a tech gadget boasting a new "nano-silicon" battery. A battery icon with an 'N' in its center appears on your glasses, with a subscript "Nano-Silicon +300% Capacity." Equipped with this insight, you gauge the competition's edge more accurately.

##### Food Blogger Interaction

At a culinary event, someone mentions a rare spice they've incorporated. Your glasses flash an image of star-shaped seeds with a label "Star Anise Licorice Flavor." Recognizing the spice visually and by its flavor profile, you can engage in a deeper discussion about its culinary applications.

##### Debate on Nutrition

A friend claims that the Keto diet is the most effective for rapid weight loss. As the debate heats up, your glasses flash a comparison chart of popular diets over a three-month period. While Keto shows initial rapid loss, another diet displays more sustainable results. You share this, shifting the conversation from short-term efficacy to long-term health benefits.

##### Wearable Tech Affordances

In a workshop focused on wearable technology, a debate arises about the balance between functionality and cognitive load. Your glasses quickly reference several cognitive load theories and provide a visual overlay of optimal data chunks for quick consumption. This aids the team in determining just how much information a wearable should display at any given moment to be both useful and user-friendly.

##### Lunchtime Talk on Space Exploration

As the table discusses the viability of Mars colonization, someone skeptically mentions the resource cost. Your glasses project a concise infographic comparing the cost of space missions against their potential for resource discovery, like water or minerals on Mars. This propels the conversation from expenditure critique to the potential returns of such endeavors.

##### Backyard Chat on Sustainable Fashion

A neighbor mentions buying only from brands that use recycled materials. Your glasses showcase a quick pie chart on a brand she mentions, depicting its material sources. While a chunk is recycled, a notable portion isn't. You gently introduce the topic of greenwashing in the industry, leading to a broader discussion on informed consumer choices.

##### Electronics Workshop

While brainstorming on a new drone design, a colleague suggests integrating "gallium nitride" (GaN) transistors. An electron flow animation on your glasses contrasts silicon vs. GaN transistors, with GaN showing faster flow rates. You comprehend its impact on drone performance and discuss its cost-benefit for your prototype.

## Install/Setup

### Backend

See this guide: [Backend Setup Guide](./server/README.md)

### Frontend

See this guide: [Frontend Setup Guide](./web_frontend/README.md)

### Wearables

1. Install and run the [SmartGlassesManager](https://github.com/TeamOpenSmartGlasses/SmartGlassesManager).
2. Install and run the Convoscope Android app located in ./android_app
3. Start Convoscope using the SmartGlassesManager launcher.

##### Building OGG/Orbis C++ for ASP

(You probably don't need this)

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

## Authors / Team

Convoscope is made by TeamOpenSmartGlasses.

#### Convoscope Contributors

- Cayden Pierce
- Alex Israelov
- Kenji Phang
- Nicolo Micheletti
- Jeremy Stairs
- Aaditya Vaze

##### How To Make Your Own Smart Glasses App

To use the SmartGlassesManager in your own apps, follow this tutorial: https://github.com/TeamOpenSmartGlasses/SmartGlassesManager/wiki/How-to-write-a-Smart-Glasses-App-in-30-minutes

SmartGlassesManager Github: https://github.com/TeamOpenSmartGlasses/SmartGlassesManager

## TeamOpenSmartGlasses (TOSG)

https://teamopensmartglasses.com

TeamOpenSmartGlasses is a team building open source smart glasses tech to upgrade human thinking. Our industry partners include companies like Vuzix, Activelook, TCL, and others. To get involved, checkout our website https://teamopensmartglasses.com or our [Discord server](https://discord.gg/bAKsjh8CtE).

## Help / Contribute 

Convoscope is still work in progress and still in active development. Reach out on the [TeamOpenSmartGlasses Discord server](https://discord.gg/bAKsjh8CtE).

## License

MIT License Copyright 2023 TeamOpenSmartGlasses
