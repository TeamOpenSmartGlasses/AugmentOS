#!/bin/sh

set -e
set -u

# Check if necessary commands are available
if ! command -v wget >/dev/null; then
    echo "wget is not installed. Exiting."
    exit 1
fi

if ! command -v unzip >/dev/null; then
    echo "unzip is not installed. Exiting."
    exit 1
fi

# Download and unzip GloVe embeddings
if [ ! -f "glove.6B.zip" ]; then
    wget https://nlp.stanford.edu/data/glove.6B.zip
fi

if [ $? -eq 0 ]; then
    unzip -n glove.6B.zip -d glove.6B
    # Remove the ZIP file
    rm -f glove.6B.zip
else
    echo "Failed to download glove.6B.zip"
    exit 1
fi

echo "Done."
