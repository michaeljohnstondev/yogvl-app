Running 'gradlew :app:assembleDebug' in /home/expo/workingdir/build/android
Downloading https://services.gradle.org/distributions/gradle-8.8-all.zip
10%
20%.
30%
40%
50%
60%.
70%
80%
90%
100%
Welcome to Gradle 8.8!
Here are the highlights of this release:

- Running Gradle on Java 22
- Configurable Gradle daemon JVM
- Improved IDE performance for large projects
  For more details see https://docs.gradle.org/8.8/release-notes.html
  To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.8/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
  Daemon will be stopped at the end of the build
  > Task :react-settings-plugin:checkKotlinGradlePluginConfigurationErrors
  > Task :react-settings-plugin:pluginDescriptors
  > Task :react-settings-plugin:processResources
  > Task :react-settings-plugin:compileKotlin
  > Task :react-settings-plugin:compileJava NO-SOURCE
  > Task :react-settings-plugin:classes
  > Task :react-settings-plugin:jar
  > Task :gradle-plugin:checkKotlinGradlePluginConfigurationErrors
  > Task :expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
  > Task :expo-dev-launcher-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
  > Task :expo-updates-gradle-plugin:pluginDescriptors
  > Task :expo-updates-gradle-plugin:processResources
  > Task :expo-dev-launcher-gradle-plugin:pluginDescriptors
  > Task :expo-dev-launcher-gradle-plugin:processResources
  > Task :gradle-plugin:pluginDescriptors
  > Task :gradle-plugin:processResources
  > Task :expo-dev-launcher-gradle-plugin:compileKotlin
  > Task :expo-dev-launcher-gradle-plugin:compileJava NO-SOURCE
  > Task :expo-dev-launcher-gradle-plugin:classes
  > Task :expo-dev-launcher-gradle-plugin:jar
  > Task :gradle-plugin:compileKotlin
  > Task :gradle-plugin:compileJava NO-SOURCE
  > Task :gradle-plugin:classes
  > Task :gradle-plugin:jar
  > Task :expo-updates-gradle-plugin:compileKotlin
  > Task :expo-updates-gradle-plugin:compileJava NO-SOURCE
  > Task :expo-updates-gradle-plugin:classes
  > Task :expo-updates-gradle-plugin:jar
  > Configure project :app
  > ℹ️ [33mApplying gradle plugin[0m '[32mexpo-dev-launcher-gradle-plugin[0m' (expo-dev-launcher@4.0.29)
  > ℹ️ [33mApplying gradle plugin[0m '[32mexpo-updates-gradle-plugin[0m' (expo-updates@0.25.28)
  > FAILURE: Build failed with an exception.

* Where:
  Build file '/home/expo/workingdir/build/android/build.gradle' line: 25
* What went wrong:
  A problem occurred evaluating root project 'bvs-app'.
  > Failed to apply plugin 'com.facebook.react.rootproject'.
  > A problem occurred configuring project ':app'.
  > Removing unused resources requires unused code shrinking to be turned on. See http://d.android.com/r/tools/shrink-resources.html for more information.
* Try:
  > Run with --stacktrace option to get the stack trace.
  > Run with --info or --debug option to get more log output.
  > Run with --scan to get full insights.
  > Get more help at https://help.gradle.org.
  > BUILD FAILED in 1m 43s
  > 20 actionable tasks: 20 executed
  > Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.
