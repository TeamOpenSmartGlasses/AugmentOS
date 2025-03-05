---
sidebar_position: 1
---

# Intro

Welcome to the AugmentOS TPA SDK!  This SDK provides everything you need to build server-side applications (called **Third Party Applications** or **TPAs**) that extend the functionality of AugmentOS smart glasses.  If you want to create real-time, interactive experiences on the glasses, you're in the right place.

## 🚧 Disclaimer 🚧
These Docs are still under construction 👷🚧, and the code is evolving fast. 
If you have any issues or get stuck, feel free to reach out at isaiah@mentra.glass.

**What is a TPA?**

A TPA is a Node.js application that runs on a server (or serverless environment) and communicates with the AugmentOS Cloud. The cloud acts as a bridge between your TPA and the user's smart glasses.  Your TPA can:

*   **Receive real-time data** from the glasses, such as:
    *   Speech (transcription)
    *   Head position (up/down)
    *   Button presses
    *   Phone notifications
    *   Location updates
    *   And more...
*   **Control the glasses' display:**  Show text, cards, and other UI elements.
*   **Integrate with external services:** Connect to APIs, databases, and other services to provide rich functionality.

**Why Build a TPA?**

*   **Extend the Glasses:** Add new features and capabilities beyond the built-in OS functionality.
*   **Real-time Interaction:** Create experiences that respond instantly to user input and the environment.
*   **AR Content:**  Display contextual information and interfaces directly in the user's field of view.
*   **Server-Side Logic:**  Perform complex processing, data analysis, and integrations on the server, keeping the glasses lightweight.

**Key Benefits of the SDK:**

*   **Simplified Development:**  Easy-to-use classes and methods handle the complexities of WebSocket communication and data parsing.
*   **Type Safety:**  TypeScript provides strong typing, improving code reliability and developer experience.
*   **Event-Driven:**  React to events from the glasses and the cloud in a clean, organized way.
*   **Flexible Layouts:**  Control the glasses' display with a variety of pre-built layout types.
*   **Well-Documented:**  Comprehensive documentation and examples to guide you.

**This Documentation Will Cover:**

*   **Getting Started:** Setting up your environment and creating a basic TPA.
*   **Core Concepts:**  Understanding the key principles of the AugmentOS ecosystem.
*   **TPA Lifecycle:**  How TPAs connect, run, and interact with the cloud.
*   **Events:**  Handling real-time data from the glasses.
*   **Layouts:**  Displaying content on the glasses.
*   **Configuration:**  Setting up your TPA's configuration files.
*   **Best Practices:**  Security, error handling, and performance tips.
*   **API Reference:**  Detailed documentation for all SDK classes and methods.

Let's get started!  Move on to the [Getting Started](./getting-started) guide to build your first TPA.