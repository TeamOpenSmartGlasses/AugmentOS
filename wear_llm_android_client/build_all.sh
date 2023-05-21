# Set up a logging file.
LOG_FILE_NAME=build_log.txt
rm -f "${LOG_FILE_NAME}"
touch "${LOG_FILE_NAME}"
LOG_FILE=$(readlink -f "${LOG_FILE_NAME}")

# Build Ogg and Opus libs.
cd app/third_party/build
echo "Building third party dependencies..."
echo "  Downloading and building Ogg and Opus libraries. This may take a minute or two."
#echo "  See ${LOG_FILE} for logs."
echo "  See stdout for logs."
chmod 755 build_all.sh
./build_all.sh #> "${LOG_FILE}" 2>&1
if [ $? -eq 0 ]; then
  echo -e "\e[32m  Dependencies successfully built.\e[0m"
  cd ../../..
else
  #echo -e "\e[31m  Dependencies did not build successfully. See ${LOG_FILE} for errors.\e[0m"
  echo -e "\e[31m  Dependencies did not build successfully. See output above for errors.\e[0m"
  cd ../../..
  exit 1
fi

# Tell gradle where the Android SDK is located.
echo sdk.dir="${ANDROID_SDK_PATH}" > local.properties

# Build the app.
echo "Building Live Transcribe Speech Engine demo app..."
gradle wrapper #>> "${LOG_FILE}" 2>&1
./gradlew assembleDebug --stacktrace #>> "${LOG_FILE}" 2>&1
if [ $? -eq 0 ]; then
  echo -e "\e[32m  Demo app successfully built.\e[0m"
else
  #echo -e "\e[31m  Demo app did not build successfully. See ${LOG_FILE} for errors.\e[0m"
  echo -e "\e[31m  Demo app did not build successfully. See output above for errors.\e[0m"
  exit 1
fi
