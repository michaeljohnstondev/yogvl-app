Running 'gradlew :app:bundleRelease' in /home/expo/workingdir/build/android
Downloading https://services.gradle.org/distributions/gradle-8.8-all.zip
10%.
20%.
30%.
40%.
50%
60%
70%.
80%.
90%.
100%
Welcome to Gradle 8.8!
Here are the highlights of this release:
- Running Gradle on Java 22
 - Configurable Gradle daemon JVM
 - Improved IDE performance for large projects
For more details see https://docs.gradle.org/8.8/release-notes.html
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.8/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :gradle-plugin:settings-plugin:pluginDescriptors
> Task :gradle-plugin:settings-plugin:processResources
> Task :gradle-plugin:settings-plugin:compileKotlin
> Task :gradle-plugin:settings-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:settings-plugin:classes
> Task :gradle-plugin:settings-plugin:jar
> Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-updates-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-dev-launcher-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
> Task :expo-updates-gradle-plugin:pluginDescriptors
> Task :expo-updates-gradle-plugin:processResources
> Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors
> Task :gradle-plugin:react-native-gradle-plugin:processResources
> Task :expo-dev-launcher-gradle-plugin:pluginDescriptors
> Task :expo-dev-launcher-gradle-plugin:processResources
> Task :expo-dev-launcher-gradle-plugin:compileKotlin
> Task :expo-dev-launcher-gradle-plugin:compileJava
NO-SOURCE
> Task :expo-dev-launcher-gradle-plugin:classes
> Task :expo-dev-launcher-gradle-plugin:jar
> Task :gradle-plugin:react-native-gradle-plugin:compileKotlin
> Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:react-native-gradle-plugin:classes
> Task :gradle-plugin:react-native-gradle-plugin:jar
> Task :expo-updates-gradle-plugin:compileKotlin
> Task :expo-updates-gradle-plugin:compileJava NO-SOURCE
> Task :expo-updates-gradle-plugin:classes
> Task :expo-updates-gradle-plugin:jar
> Configure project :app
ℹ️  [33mApplying gradle plugin[0m '[32mexpo-dev-launcher-gradle-plugin[0m' (expo-dev-launcher@4.0.29)
 ℹ️  [33mApplying gradle plugin[0m '[32mexpo-updates-gradle-plugin[0m' (expo-updates@0.25.28)
> Configure project :expo
Using expo modules
  - [32mexpo-asset[0m (10.0.10)
  - [32mexpo-blur[0m (13.0.3)
  - [32mexpo-constants[0m (16.0.2)
  - [32mexpo-contacts[0m (13.0.5)
  - [32mexpo-crypto[0m (13.0.2)
  - [32mexpo-dev-client[0m (4.0.29)
  - [32mexpo-dev-launcher[0m (4.0.29)
  - [32mexpo-dev-menu[0m (5.0.23)
  - [32mexpo-device[0m (6.0.2)
  - [32mexpo-eas-client[0m (0.12.0)
  - [32mexpo-file-system[0m (17.0.1)
  - [32mexpo-font[0m (12.0.10)
  - [32mexpo-image-loader[0m (4.7.0)
  - [32mexpo-image-picker[0m (15.1.0)
  - [32mexpo-json-utils[0m (0.13.1)
- [32mexpo-keep-awake[0m (13.0.2)
  - [32mexpo-linear-gradient[0m (13.0.2)
  - [32mexpo-location[0m (17.0.1)
  - [32mexpo-manifests[0m (0.14.3)
  - [32mexpo-modules-core[0m (1.12.26)
  - [32mexpo-secure-store[0m (13.0.2)
  - [32mexpo-sharing[0m (12.0.1)
  - [32mexpo-splash-screen[0m (0.27.7)
- [32mexpo-structured-headers[0m (3.8.0)
  - [32mexpo-updates[0m (0.25.28)
> Configure project :react-native-firebase_app
:react-native-firebase_app package.json found at /home/expo/workingdir/build/node_modules/@react-native-firebase/app/package.json
:react-native-firebase_app:firebase.bom using default value: 33.1.2
:react-native-firebase_app:play.play-services-auth using default value: 21.2.0
:react-native-firebase_app package.json found at /home/expo/workingdir/build/node_modules/@react-native-firebase/app/package.json
:react-native-firebase_app:version set from package.json: 20.5.0 (20,5,0 - 20005000)
:react-native-firebase_app:android.compileSdk using custom value: 34
:react-native-firebase_app:android.targetSdk using custom value: 34
:react-native-firebase_app:android.minSdk using custom value: 23
:react-native-firebase_app:reactNativeAndroidDir /home/expo/workingdir/build/node_modules/react-native/android
> Configure project :react-native-firebase_messaging
:react-native-firebase_messaging package.json found at /home/expo/workingdir/build/node_modules/@react-native-firebase/messaging/package.json
:react-native-firebase_app package.json found at /home/expo/workingdir/build/node_modules/@react-native-firebase/app/package.json
:react-native-firebase_messaging:firebase.bom using default value: 33.1.2
:react-native-firebase_messaging package.json found at /home/expo/workingdir/build/node_modules/@react-native-firebase/messaging/package.json
:react-native-firebase_messaging:version set from package.json: 20.5.0 (20,5,0 - 20005000)
:react-native-firebase_messaging:android.compileSdk using custom value: 34
:react-native-firebase_messaging:android.targetSdk using custom value: 34
:react-native-firebase_messaging:android.minSdk using custom value: 23
:react-native-firebase_messaging:reactNativeAndroidDir /home/expo/workingdir/build/node_modules/react-native/android
> Configure project :react-native-reanimated
Android gradle plugin: 8.2.1
Gradle: 8.8
> Task :expo-asset:preBuild UP-TO-DATE
> Task :expo-asset:preReleaseBuild UP-TO-DATE
> Task :expo-blur:preBuild UP-TO-DATE
> Task :expo-blur:preReleaseBuild UP-TO-DATE
> Task :expo-blur:generateReleaseResValues
> Task :expo-blur:generateReleaseResources
> Task :expo-asset:generateReleaseResValues
> Task :expo-asset:generateReleaseResources
> Task :expo-asset:packageReleaseResources
> Task :expo-blur:packageReleaseResources
> Task :expo-contacts:preBuild
UP-TO-DATE
> Task :expo-contacts:preReleaseBuild UP-TO-DATE
> Task :expo-contacts:generateReleaseResValues
> Task :expo-contacts:generateReleaseResources
> Task :expo-contacts:packageReleaseResources
> Task :expo-crypto:preBuild UP-TO-DATE
> Task :expo-crypto:preReleaseBuild UP-TO-DATE
> Task :expo-crypto:generateReleaseResValues
> Task :expo-crypto:generateReleaseResources
> Task :expo-crypto:packageReleaseResources
> Task :expo-dev-client:preBuild UP-TO-DATE
> Task :expo-dev-client:preReleaseBuild
UP-TO-DATE
> Task :expo-dev-client:generateReleaseResValues
> Task :expo-dev-client:generateReleaseResources
> Task :expo-dev-client:packageReleaseResources
> Task :expo-dev-launcher:preBuild UP-TO-DATE
> Task :expo-dev-launcher:preReleaseBuild UP-TO-DATE
> Task :expo-dev-launcher:generateReleaseResValues
> Task :expo-dev-launcher:generateReleaseResources
> Task :expo:generateExpoModulesPackageListTask
> Task :expo:preBuild
> Task :expo:preReleaseBuild
> Task :expo:generateReleaseResValues
> Task :expo:generateReleaseResources
> Task :expo:packageReleaseResources
> Task :expo-dev-menu:preBuild UP-TO-DATE
> Task :expo-dev-menu:preReleaseBuild UP-TO-DATE
> Task :expo-dev-menu:generateReleaseResValues
> Task :expo-dev-menu:generateReleaseResources
> Task :expo-constants:createExpoConfig
> Task :expo-constants:preBuild
The NODE_ENV environment variable is required but was not specified. Ensure the project is bundled with Expo CLI or NODE_ENV is set.
Proceeding without mode-specific .env
> Task :expo-constants:preReleaseBuild
> Task :expo-constants:generateReleaseResValues
> Task :expo-dev-menu:packageReleaseResources
> Task :expo-dev-menu-interface:preBuild UP-TO-DATE
> Task :expo-dev-menu-interface:preReleaseBuild UP-TO-DATE
> Task :expo-constants:generateReleaseResources
> Task :expo-dev-menu-interface:generateReleaseResValues
> Task :expo-dev-menu-interface:generateReleaseResources
> Task :expo-dev-menu-interface:packageReleaseResources
> Task :expo-constants:packageReleaseResources
> Task :expo-device:preBuild UP-TO-DATE
> Task :expo-device:preReleaseBuild UP-TO-DATE
> Task :expo-eas-client:preBuild UP-TO-DATE
> Task :expo-eas-client:preReleaseBuild UP-TO-DATE
> Task :expo-device:generateReleaseResValues
> Task :expo-device:generateReleaseResources
> Task :expo-eas-client:generateReleaseResValues
> Task :expo-eas-client:generateReleaseResources
> Task :expo-device:packageReleaseResources
> Task :expo-file-system:preBuild UP-TO-DATE
> Task :expo-file-system:preReleaseBuild UP-TO-DATE
> Task :expo-eas-client:packageReleaseResources
> Task :expo-font:preBuild UP-TO-DATE
> Task :expo-font:preReleaseBuild UP-TO-DATE
> Task :expo-file-system:generateReleaseResValues
> Task :expo-file-system:generateReleaseResources
> Task :expo-font:generateReleaseResValues
> Task :expo-font:generateReleaseResources
> Task :expo-file-system:packageReleaseResources
> Task :expo-font:packageReleaseResources
> Task :expo-image-picker:preBuild UP-TO-DATE
> Task :expo-image-picker:preReleaseBuild UP-TO-DATE
> Task :expo-image-loader:preBuild UP-TO-DATE
> Task :expo-image-loader:preReleaseBuild UP-TO-DATE
> Task :expo-image-loader:generateReleaseResValues
> Task :expo-image-picker:generateReleaseResValues
> Task :expo-image-loader:generateReleaseResources
> Task :expo-image-picker:generateReleaseResources
> Task :expo-image-loader:packageReleaseResources
> Task :expo-json-utils:preBuild UP-TO-DATE
> Task :expo-json-utils:preReleaseBuild UP-TO-DATE
> Task :expo-image-picker:packageReleaseResources
> Task :expo-keep-awake:preBuild UP-TO-DATE
> Task :expo-keep-awake:preReleaseBuild UP-TO-DATE
> Task :expo-json-utils:generateReleaseResValues
> Task :expo-json-utils:generateReleaseResources
> Task :expo-keep-awake:generateReleaseResValues
> Task :expo-keep-awake:generateReleaseResources
> Task :expo-json-utils:packageReleaseResources
> Task :expo-linear-gradient:preBuild UP-TO-DATE
> Task :expo-linear-gradient:preReleaseBuild UP-TO-DATE
> Task :expo-linear-gradient:generateReleaseResValues
> Task :expo-linear-gradient:generateReleaseResources
> Task :expo-keep-awake:packageReleaseResources
> Task :expo-location:preBuild UP-TO-DATE
> Task :expo-location:preReleaseBuild UP-TO-DATE
> Task :expo-location:generateReleaseResValues
> Task :expo-location:generateReleaseResources
> Task :expo-linear-gradient:packageReleaseResources
> Task :expo-manifests:preBuild UP-TO-DATE
> Task :expo-manifests:preReleaseBuild UP-TO-DATE
> Task :expo-manifests:generateReleaseResValues
> Task :expo-manifests:generateReleaseResources
> Task :expo-location:packageReleaseResources
> Task :expo-modules-core:preBuild UP-TO-DATE
> Task :expo-modules-core:preReleaseBuild UP-TO-DATE
> Task :expo-modules-core:generateReleaseResValues
> Task :expo-modules-core:generateReleaseResources
> Task :expo-manifests:packageReleaseResources
> Task :expo-secure-store:preBuild UP-TO-DATE
> Task :expo-secure-store:preReleaseBuild UP-TO-DATE
> Task :expo-secure-store:generateReleaseResValues
> Task :expo-secure-store:generateReleaseResources
> Task :expo-modules-core:packageReleaseResources
> Task :expo-sharing:preBuild UP-TO-DATE
> Task :expo-sharing:preReleaseBuild UP-TO-DATE
> Task :expo-secure-store:packageReleaseResources
> Task :expo-splash-screen:preBuild UP-TO-DATE
> Task :expo-splash-screen:preReleaseBuild UP-TO-DATE
> Task :expo-sharing:generateReleaseResValues
> Task :expo-sharing:generateReleaseResources
> Task :expo-splash-screen:generateReleaseResValues
> Task :expo-splash-screen:generateReleaseResources
> Task :expo-dev-launcher:packageReleaseResources
> Task :expo-structured-headers:preBuild UP-TO-DATE
> Task :expo-sharing:packageReleaseResources
> Task :expo-updates:preBuild UP-TO-DATE
> Task :expo-structured-headers:preReleaseBuild UP-TO-DATE
> Task :expo-updates:preReleaseBuild UP-TO-DATE
> Task :expo-updates:generateReleaseResValues
> Task :expo-updates:generateReleaseResources
> Task :expo-structured-headers:generateReleaseResValues
> Task :expo-structured-headers:generateReleaseResources
> Task :expo-updates:packageReleaseResources
> Task :expo-updates-interface:preBuild UP-TO-DATE
> Task :expo-structured-headers:packageReleaseResources
> Task :react-native-async-storage_async-storage:preBuild UP-TO-DATE
> Task :expo-updates-interface:preReleaseBuild UP-TO-DATE
> Task :react-native-async-storage_async-storage:preReleaseBuild UP-TO-DATE
> Task :react-native-async-storage_async-storage:generateReleaseResValues
> Task :expo-updates-interface:generateReleaseResValues
> Task :react-native-async-storage_async-storage:generateReleaseResources
> Task :expo-updates-interface:generateReleaseResources
> Task :expo-splash-screen:packageReleaseResources
> Task :react-native-community_datetimepicker:preBuild UP-TO-DATE
> Task :react-native-community_datetimepicker:preReleaseBuild UP-TO-DATE
> Task :react-native-community_datetimepicker:generateReleaseResValues
> Task :react-native-community_datetimepicker:generateReleaseResources
> Task :react-native-async-storage_async-storage:packageReleaseResources
> Task :expo-updates-interface:packageReleaseResources
> Task :react-native-firebase_app:preBuild UP-TO-DATE
> Task :react-native-firebase_app:preReleaseBuild UP-TO-DATE
> Task :react-native-firebase_messaging:preBuild UP-TO-DATE
> Task :react-native-firebase_messaging:preReleaseBuild UP-TO-DATE
> Task :react-native-firebase_messaging:generateReleaseResValues
> Task :react-native-firebase_messaging:generateReleaseResources
> Task :react-native-firebase_app:generateReleaseResValues
> Task :react-native-firebase_app:generateReleaseResources
> Task :react-native-community_datetimepicker:packageReleaseResources
> Task :react-native-gesture-handler:preBuild UP-TO-DATE
> Task :react-native-gesture-handler:preReleaseBuild UP-TO-DATE
> Task :react-native-gesture-handler:generateReleaseResValues
> Task :react-native-gesture-handler:generateReleaseResources
> Task :react-native-firebase_app:packageReleaseResources
> Task :react-native-reanimated:assertLatestReactNativeWithNewArchitectureTask SKIPPED
> Task :react-native-reanimated:assertMinimalReactNativeVersionTask SKIPPED
> Task :react-native-gesture-handler:packageReleaseResources
> Task :react-native-safe-area-context:preBuild UP-TO-DATE
> Task :react-native-safe-area-context:preReleaseBuild UP-TO-DATE
> Task :react-native-safe-area-context:generateReleaseResValues
> Task :react-native-safe-area-context:generateReleaseResources
> Task :react-native-firebase_messaging:packageReleaseResources
> Task :react-native-screens:preBuild UP-TO-DATE
> Task :react-native-screens:preReleaseBuild UP-TO-DATE
> Task :react-native-screens:generateReleaseResValues
> Task :react-native-screens:generateReleaseResources
> Task :react-native-safe-area-context:packageReleaseResources
> Task :react-native-svg:preBuild UP-TO-DATE
> Task :react-native-svg:preReleaseBuild UP-TO-DATE
> Task :react-native-svg:generateReleaseResValues
> Task :react-native-svg:generateReleaseResources
> Task :react-native-svg:packageReleaseResources
> Task :react-native-reanimated:prepareHeadersForPrefab
> Task :react-native-reanimated:preBuild
> Task :react-native-reanimated:preReleaseBuild
> Task :expo:extractDeepLinksRelease
> Task :react-native-reanimated:generateReleaseResValues
> Task :react-native-reanimated:generateReleaseResources
> Task :react-native-screens:packageReleaseResources
> Task :expo-asset:extractDeepLinksRelease
> Task :react-native-reanimated:packageReleaseResources
> Task :expo-blur:extractDeepLinksRelease
> Task :expo-blur:processReleaseManifest
> Task :expo:processReleaseManifest
> Task :expo-asset:processReleaseManifest
> Task :expo-constants:extractDeepLinksRelease
> Task :expo-crypto:extractDeepLinksRelease
> Task :expo-contacts:extractDeepLinksRelease
> Task :expo-crypto:processReleaseManifest
> Task :expo-constants:processReleaseManifest
> Task :expo-dev-launcher:extractDeepLinksRelease
> Task :expo-dev-client:extractDeepLinksRelease
> Task :expo-contacts:processReleaseManifest
> Task :expo-dev-menu:extractDeepLinksRelease
> Task :expo-dev-menu:processReleaseManifest
> Task :expo-dev-launcher:processReleaseManifest
> Task :expo-dev-client:processReleaseManifest
> Task :expo-eas-client:extractDeepLinksRelease
> Task :expo-dev-menu-interface:extractDeepLinksRelease
> Task :expo-device:extractDeepLinksRelease
> Task :expo-dev-menu-interface:processReleaseManifest
> Task :expo-device:processReleaseManifest
> Task :expo-file-system:extractDeepLinksRelease
> Task :expo-font:extractDeepLinksRelease
> Task :expo-eas-client:processReleaseManifest
> Task :expo-image-loader:extractDeepLinksRelease
> Task :expo-font:processReleaseManifest
> Task :expo-image-picker:extractDeepLinksRelease
> Task :expo-image-loader:processReleaseManifest
> Task :expo-json-utils:extractDeepLinksRelease
> Task :expo-file-system:processReleaseManifest
/home/expo/workingdir/build/node_modules/expo-file-system/android/src/main/AndroidManifest.xml:6:9-8:20 Warning:
provider#expo.modules.filesystem.FileSystemFileProvider@android:authorities was tagged at AndroidManifest.xml:6 to replace other declarations but no other declaration present
> Task :expo-keep-awake:extractDeepLinksRelease
> Task :expo-json-utils:processReleaseManifest
> Task :expo-linear-gradient:extractDeepLinksRelease
> Task :expo-keep-awake:processReleaseManifest
> Task :expo-location:extractDeepLinksRelease
> Task :expo-image-picker:processReleaseManifest
> Task :expo-linear-gradient:processReleaseManifest
> Task :expo-manifests:extractDeepLinksRelease
> Task :expo-modules-core:extractDeepLinksRelease
> Task :expo-location:processReleaseManifest
> Task :expo-secure-store:extractDeepLinksRelease
> Task :expo-manifests:processReleaseManifest
> Task :expo-sharing:extractDeepLinksRelease
> Task :expo-modules-core:processReleaseManifest
/home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/AndroidManifest.xml:8:9-11:45 Warning:
	meta-data#com.facebook.soloader.enabled@android:value was tagged at AndroidManifest.xml:8 to replace other declarations but no other declaration present
> Task :expo-secure-store:processReleaseManifest
> Task :expo-splash-screen:extractDeepLinksRelease
> Task :expo-structured-headers:extractDeepLinksRelease
> Task :expo-sharing:processReleaseManifest
> Task :expo-structured-headers:processReleaseManifest
> Task :expo-splash-screen:processReleaseManifest
> Task :expo-updates:extractDeepLinksRelease
> Task :expo-updates-interface:extractDeepLinksRelease
> Task :react-native-async-storage_async-storage:extractDeepLinksRelease
> Task :expo-updates-interface:processReleaseManifest
> Task :react-native-community_datetimepicker:extractDeepLinksRelease
> Task :expo-updates:processReleaseManifest
> Task :react-native-firebase_app:extractDeepLinksRelease
> Task :react-native-async-storage_async-storage:processReleaseManifest
package="com.reactnativecommunity.asyncstorage" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.reactnativecommunity.asyncstorage" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
> Task :react-native-community_datetimepicker:processReleaseManifest
> Task :react-native-gesture-handler:extractDeepLinksRelease
> Task :react-native-firebase_messaging:extractDeepLinksRelease
> Task :react-native-firebase_app:processReleaseManifest
package="io.invertase.firebase" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-firebase/app/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="io.invertase.firebase" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-firebase/app/android/src/main/AndroidManifest.xml.
> Task :react-native-gesture-handler:processReleaseManifest
package="com.swmansion.gesturehandler" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-gesture-handler/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.swmansion.gesturehandler" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-gesture-handler/android/src/main/AndroidManifest.xml.
> Task :react-native-reanimated:extractDeepLinksRelease
> Task :react-native-safe-area-context:extractDeepLinksRelease
> Task :react-native-firebase_messaging:processReleaseManifest
package="io.invertase.firebase.messaging" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-firebase/messaging/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="io.invertase.firebase.messaging" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-firebase/messaging/android/src/main/AndroidManifest.xml.
> Task :react-native-screens:extractDeepLinksRelease
> Task :react-native-safe-area-context:processReleaseManifest
package="com.th3rdwave.safeareacontext" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.th3rdwave.safeareacontext" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
> Task :react-native-svg:extractDeepLinksRelease
> Task :react-native-reanimated:processReleaseManifest
package="com.swmansion.reanimated" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-reanimated/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.swmansion.reanimated" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-reanimated/android/src/main/AndroidManifest.xml.
> Task :react-native-screens:processReleaseManifest
> Task :react-native-svg:processReleaseManifest
package="com.horcrux.svg" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-svg/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.horcrux.svg" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-svg/android/src/main/AndroidManifest.xml.
> Task :expo-blur:writeReleaseAarMetadata
> Task :expo:writeReleaseAarMetadata
> Task :expo-asset:writeReleaseAarMetadata
> Task :expo-contacts:writeReleaseAarMetadata
> Task :expo-constants:writeReleaseAarMetadata
> Task :expo-crypto:writeReleaseAarMetadata
> Task :expo-dev-client:writeReleaseAarMetadata
> Task :expo-dev-launcher:writeReleaseAarMetadata
> Task :expo-dev-menu:writeReleaseAarMetadata
> Task :expo-dev-menu-interface:writeReleaseAarMetadata
> Task :expo-device:writeReleaseAarMetadata
> Task :expo-eas-client:writeReleaseAarMetadata
> Task :expo-file-system:writeReleaseAarMetadata
> Task :expo-image-loader:writeReleaseAarMetadata
> Task :expo-font:writeReleaseAarMetadata
> Task :expo-image-picker:writeReleaseAarMetadata
> Task :expo-keep-awake:writeReleaseAarMetadata
> Task :expo-json-utils:writeReleaseAarMetadata
> Task :expo-location:writeReleaseAarMetadata
> Task :expo-linear-gradient:writeReleaseAarMetadata
> Task :expo-manifests:writeReleaseAarMetadata
> Task :expo-modules-core:writeReleaseAarMetadata
> Task :expo-secure-store:writeReleaseAarMetadata
> Task :expo-sharing:writeReleaseAarMetadata
> Task :expo-structured-headers:writeReleaseAarMetadata
> Task :expo-splash-screen:writeReleaseAarMetadata
> Task :expo-updates-interface:writeReleaseAarMetadata
> Task :expo-updates:writeReleaseAarMetadata
> Task :react-native-async-storage_async-storage:writeReleaseAarMetadata
> Task :react-native-community_datetimepicker:writeReleaseAarMetadata
> Task :react-native-firebase_app:writeReleaseAarMetadata
> Task :react-native-firebase_messaging:writeReleaseAarMetadata
> Task :react-native-reanimated:writeReleaseAarMetadata
> Task :react-native-gesture-handler:writeReleaseAarMetadata
> Task :react-native-safe-area-context:writeReleaseAarMetadata
> Task :react-native-svg:writeReleaseAarMetadata
> Task :react-native-screens:writeReleaseAarMetadata
> Task :app:createBundleReleaseJsAndAssets
Starting Metro Bundler
warning: Bundler cache is empty, rebuilding (this may take a minute)
> Task :expo-blur:compileReleaseLibraryResources
> Task :expo-asset:compileReleaseLibraryResources
> Task :expo:compileReleaseLibraryResources
> Task :expo-blur:parseReleaseLocalResources
> Task :expo-asset:parseReleaseLocalResources
> Task :expo:parseReleaseLocalResources
> Task :expo-blur:generateReleaseRFile
> Task :expo:generateReleaseRFile
> Task :expo-asset:generateReleaseRFile
> Task :expo-contacts:compileReleaseLibraryResources
> Task :expo-crypto:compileReleaseLibraryResources
> Task :expo-constants:compileReleaseLibraryResources
> Task :expo-contacts:parseReleaseLocalResources
> Task :expo-crypto:parseReleaseLocalResources
> Task :expo-constants:parseReleaseLocalResources
> Task :expo-contacts:generateReleaseRFile
> Task :expo-crypto:generateReleaseRFile
> Task :expo-constants:generateReleaseRFile
> Task :expo-dev-client:compileReleaseLibraryResources
> Task :expo-dev-client:parseReleaseLocalResources
> Task :expo-dev-launcher:compileReleaseLibraryResources
> Task :expo-dev-client:generateReleaseRFile
> Task :expo-dev-menu:compileReleaseLibraryResources
> Task :expo-dev-menu:parseReleaseLocalResources
> Task :expo-dev-launcher:parseReleaseLocalResources
> Task :expo-dev-menu-interface:compileReleaseLibraryResources
> Task :expo-dev-menu:generateReleaseRFile
> Task :expo-dev-menu-interface:parseReleaseLocalResources
> Task :expo-dev-launcher:generateReleaseRFile
> Task :expo-device:compileReleaseLibraryResources
> Task :expo-dev-menu-interface:generateReleaseRFile
> Task :expo-eas-client:compileReleaseLibraryResources
> Task :expo-device:parseReleaseLocalResources
> Task :expo-file-system:compileReleaseLibraryResources
> Task :expo-eas-client:parseReleaseLocalResources
> Task :expo-eas-client:generateReleaseRFile
> Task :expo-file-system:parseReleaseLocalResources
> Task :expo-device:generateReleaseRFile
> Task :expo-font:compileReleaseLibraryResources
> Task :expo-image-loader:compileReleaseLibraryResources
> Task :expo-file-system:generateReleaseRFile
> Task :expo-font:parseReleaseLocalResources
> Task :expo-image-picker:compileReleaseLibraryResources
> Task :expo-image-loader:parseReleaseLocalResources
> Task :expo-image-loader:generateReleaseRFile
> Task :expo-image-picker:parseReleaseLocalResources
> Task :expo-font:generateReleaseRFile
> Task :expo-json-utils:compileReleaseLibraryResources
> Task :expo-keep-awake:compileReleaseLibraryResources
> Task :expo-image-picker:generateReleaseRFile
> Task :expo-json-utils:parseReleaseLocalResources
> Task :expo-keep-awake:parseReleaseLocalResources
> Task :expo-linear-gradient:compileReleaseLibraryResources
> Task :expo-json-utils:generateReleaseRFile
> Task :expo-linear-gradient:parseReleaseLocalResources
> Task :expo-keep-awake:generateReleaseRFile
> Task :expo-location:compileReleaseLibraryResources
> Task :expo-location:parseReleaseLocalResources
> Task :expo-manifests:compileReleaseLibraryResources
> Task :expo-location:generateReleaseRFile
> Task :expo-linear-gradient:generateReleaseRFile
> Task :expo-manifests:parseReleaseLocalResources
> Task :expo-secure-store:compileReleaseLibraryResources
> Task :expo-modules-core:compileReleaseLibraryResources
> Task :expo-manifests:generateReleaseRFile
> Task :expo-modules-core:parseReleaseLocalResources
> Task :expo-secure-store:parseReleaseLocalResources
> Task :expo-sharing:compileReleaseLibraryResources
> Task :expo-modules-core:generateReleaseRFile
> Task :expo-secure-store:generateReleaseRFile
> Task :expo-sharing:parseReleaseLocalResources
> Task :expo-splash-screen:compileReleaseLibraryResources
> Task :expo-structured-headers:compileReleaseLibraryResources
> Task :expo-splash-screen:parseReleaseLocalResources
> Task :expo-structured-headers:parseReleaseLocalResources
> Task :expo-sharing:generateReleaseRFile
> Task :expo-updates:compileReleaseLibraryResources
> Task :expo-splash-screen:generateReleaseRFile
> Task :expo-structured-headers:generateReleaseRFile
> Task :expo-updates:parseReleaseLocalResources
> Task :expo-updates-interface:compileReleaseLibraryResources
> Task :react-native-async-storage_async-storage:compileReleaseLibraryResources
> Task :expo-updates:generateReleaseRFile
> Task :react-native-async-storage_async-storage:parseReleaseLocalResources
> Task :expo-updates-interface:parseReleaseLocalResources
> Task :react-native-async-storage_async-storage:generateReleaseRFile
> Task :react-native-community_datetimepicker:compileReleaseLibraryResources
> Task :expo-updates-interface:generateReleaseRFile
> Task :react-native-firebase_app:compileReleaseLibraryResources
> Task :react-native-community_datetimepicker:parseReleaseLocalResources
> Task :react-native-firebase_app:parseReleaseLocalResources
> Task :react-native-firebase_messaging:compileReleaseLibraryResources
> Task :react-native-community_datetimepicker:generateReleaseRFile
> Task :react-native-firebase_app:generateReleaseRFile
> Task :react-native-gesture-handler:compileReleaseLibraryResources
> Task :react-native-reanimated:compileReleaseLibraryResources
> Task :react-native-firebase_messaging:parseReleaseLocalResources
> Task :react-native-gesture-handler:parseReleaseLocalResources
> Task :react-native-reanimated:parseReleaseLocalResources
> Task :react-native-gesture-handler:generateReleaseRFile
> Task :react-native-firebase_messaging:generateReleaseRFile
> Task :react-native-reanimated:generateReleaseRFile
> Task :react-native-safe-area-context:compileReleaseLibraryResources
> Task :react-native-svg:compileReleaseLibraryResources
> Task :react-native-svg:parseReleaseLocalResources
> Task :react-native-safe-area-context:parseReleaseLocalResources
> Task :react-native-safe-area-context:generateReleaseRFile
> Task :react-native-svg:generateReleaseRFile
> Task :react-native-screens:parseReleaseLocalResources
> Task :react-native-screens:compileReleaseLibraryResources
> Task :react-native-screens:generateReleaseRFile
> Task :expo:mergeReleaseShaders
> Task :expo-asset:mergeReleaseShaders
> Task :expo-blur:mergeReleaseShaders
> Task :expo:compileReleaseShaders NO-SOURCE
> Task :expo-blur:compileReleaseShaders NO-SOURCE
> Task :expo:generateReleaseAssets UP-TO-DATE
> Task :expo-asset:compileReleaseShaders
NO-SOURCE
> Task :expo-blur:generateReleaseAssets UP-TO-DATE
> Task :expo-asset:generateReleaseAssets UP-TO-DATE
> Task :expo:packageReleaseAssets
> Task :expo-asset:packageReleaseAssets
> Task :expo-blur:packageReleaseAssets
> Task :expo-constants:mergeReleaseShaders
> Task :expo-constants:compileReleaseShaders NO-SOURCE
> Task :expo-constants:generateReleaseAssets UP-TO-DATE
> Task :expo-contacts:mergeReleaseShaders
> Task :expo-crypto:mergeReleaseShaders
> Task :expo-contacts:compileReleaseShaders NO-SOURCE
> Task :expo-contacts:generateReleaseAssets UP-TO-DATE
> Task :expo-crypto:compileReleaseShaders NO-SOURCE
> Task :expo-crypto:generateReleaseAssets UP-TO-DATE
> Task :expo-contacts:packageReleaseAssets
> Task :expo-crypto:packageReleaseAssets
> Task :expo-constants:packageReleaseAssets
> Task :expo-dev-launcher:mergeReleaseShaders
> Task :expo-dev-client:mergeReleaseShaders
> Task :expo-dev-launcher:compileReleaseShaders NO-SOURCE
> Task :expo-dev-launcher:generateReleaseAssets UP-TO-DATE
> Task :expo-dev-client:compileReleaseShaders NO-SOURCE
> Task :expo-dev-client:generateReleaseAssets UP-TO-DATE
> Task :expo-dev-menu:mergeReleaseShaders
> Task :expo-dev-menu:compileReleaseShaders NO-SOURCE
> Task :expo-dev-menu:generateReleaseAssets UP-TO-DATE
> Task :expo-dev-launcher:packageReleaseAssets
> Task :expo-dev-menu:packageReleaseAssets
> Task :expo-dev-client:packageReleaseAssets
> Task :expo-dev-menu-interface:mergeReleaseShaders
> Task :expo-dev-menu-interface:compileReleaseShaders NO-SOURCE
> Task :expo-dev-menu-interface:generateReleaseAssets UP-TO-DATE
> Task :expo-device:mergeReleaseShaders
> Task :expo-eas-client:mergeReleaseShaders
> Task :expo-device:compileReleaseShaders NO-SOURCE
> Task :expo-eas-client:compileReleaseShaders NO-SOURCE
> Task :expo-eas-client:generateReleaseAssets UP-TO-DATE
> Task :expo-device:generateReleaseAssets UP-TO-DATE
> Task :expo-dev-menu-interface:packageReleaseAssets
> Task :expo-eas-client:packageReleaseAssets
> Task :expo-device:packageReleaseAssets
> Task :expo-file-system:mergeReleaseShaders
> Task :expo-file-system:compileReleaseShaders NO-SOURCE
> Task :expo-file-system:generateReleaseAssets UP-TO-DATE
> Task :expo-image-loader:mergeReleaseShaders
> Task :expo-image-loader:compileReleaseShaders NO-SOURCE
> Task :expo-image-loader:generateReleaseAssets UP-TO-DATE
> Task :expo-font:mergeReleaseShaders
> Task :expo-font:compileReleaseShaders NO-SOURCE
> Task :expo-font:generateReleaseAssets UP-TO-DATE
> Task :expo-image-loader:packageReleaseAssets
> Task :expo-file-system:packageReleaseAssets
> Task :expo-font:packageReleaseAssets
> Task :expo-image-picker:mergeReleaseShaders
> Task :expo-json-utils:mergeReleaseShaders
> Task :expo-image-picker:compileReleaseShaders NO-SOURCE
> Task :expo-image-picker:generateReleaseAssets UP-TO-DATE
> Task :expo-json-utils:compileReleaseShaders NO-SOURCE
> Task :expo-json-utils:generateReleaseAssets UP-TO-DATE
> Task :expo-json-utils:packageReleaseAssets
> Task :expo-keep-awake:mergeReleaseShaders
> Task :expo-image-picker:packageReleaseAssets
> Task :expo-linear-gradient:mergeReleaseShaders
> Task :expo-keep-awake:compileReleaseShaders NO-SOURCE
> Task :expo-keep-awake:generateReleaseAssets UP-TO-DATE
> Task :expo-linear-gradient:compileReleaseShaders NO-SOURCE
> Task :expo-linear-gradient:generateReleaseAssets UP-TO-DATE
> Task :expo-keep-awake:packageReleaseAssets
> Task :expo-location:mergeReleaseShaders
> Task :expo-linear-gradient:packageReleaseAssets
> Task :expo-location:compileReleaseShaders NO-SOURCE
> Task :expo-location:generateReleaseAssets UP-TO-DATE
> Task :expo-manifests:mergeReleaseShaders
> Task :expo-modules-core:mergeReleaseShaders
> Task :expo-manifests:compileReleaseShaders NO-SOURCE
> Task :expo-manifests:generateReleaseAssets UP-TO-DATE
> Task :expo-location:packageReleaseAssets
> Task :expo-modules-core:compileReleaseShaders NO-SOURCE
> Task :expo-modules-core:generateReleaseAssets UP-TO-DATE
> Task :expo-manifests:packageReleaseAssets
> Task :expo-secure-store:mergeReleaseShaders
> Task :expo-modules-core:packageReleaseAssets
> Task :expo-secure-store:compileReleaseShaders NO-SOURCE
> Task :expo-sharing:mergeReleaseShaders
> Task :expo-secure-store:generateReleaseAssets UP-TO-DATE
> Task :expo-sharing:compileReleaseShaders NO-SOURCE
> Task :expo-sharing:generateReleaseAssets UP-TO-DATE
> Task :expo-splash-screen:mergeReleaseShaders
> Task :expo-secure-store:packageReleaseAssets
> Task :expo-sharing:packageReleaseAssets
> Task :expo-splash-screen:compileReleaseShaders NO-SOURCE
> Task :expo-splash-screen:generateReleaseAssets UP-TO-DATE
> Task :expo-updates:mergeReleaseShaders
> Task :expo-structured-headers:mergeReleaseShaders
> Task :expo-updates:compileReleaseShaders NO-SOURCE
> Task :expo-updates:generateReleaseAssets UP-TO-DATE
> Task :expo-splash-screen:packageReleaseAssets
> Task :expo-structured-headers:compileReleaseShaders NO-SOURCE
> Task :expo-structured-headers:generateReleaseAssets UP-TO-DATE
> Task :expo-structured-headers:packageReleaseAssets
> Task :expo-updates-interface:mergeReleaseShaders
> Task :expo-updates:packageReleaseAssets
> Task :expo-updates-interface:compileReleaseShaders NO-SOURCE
> Task :expo-updates-interface:generateReleaseAssets UP-TO-DATE
> Task :react-native-async-storage_async-storage:mergeReleaseShaders
> Task :expo-updates-interface:packageReleaseAssets
> Task :react-native-community_datetimepicker:mergeReleaseShaders
> Task :react-native-async-storage_async-storage:compileReleaseShaders NO-SOURCE
> Task :react-native-async-storage_async-storage:generateReleaseAssets UP-TO-DATE
> Task :react-native-community_datetimepicker:compileReleaseShaders NO-SOURCE
> Task :react-native-community_datetimepicker:generateReleaseAssets UP-TO-DATE
> Task :react-native-firebase_app:mergeReleaseShaders
> Task :react-native-async-storage_async-storage:packageReleaseAssets
> Task :react-native-community_datetimepicker:packageReleaseAssets
> Task :react-native-firebase_app:compileReleaseShaders NO-SOURCE
> Task :react-native-firebase_app:generateReleaseAssets UP-TO-DATE
> Task :react-native-firebase_messaging:mergeReleaseShaders
> Task :react-native-gesture-handler:mergeReleaseShaders
> Task :react-native-firebase_app:packageReleaseAssets
> Task :react-native-gesture-handler:compileReleaseShaders NO-SOURCE
> Task :react-native-gesture-handler:generateReleaseAssets UP-TO-DATE
> Task :react-native-firebase_messaging:compileReleaseShaders NO-SOURCE
> Task :react-native-firebase_messaging:generateReleaseAssets UP-TO-DATE
> Task :react-native-reanimated:mergeReleaseShaders
> Task :react-native-firebase_messaging:packageReleaseAssets
> Task :react-native-reanimated:compileReleaseShaders NO-SOURCE
> Task :react-native-reanimated:generateReleaseAssets UP-TO-DATE
> Task :react-native-safe-area-context:mergeReleaseShaders
> Task :react-native-gesture-handler:packageReleaseAssets
> Task :react-native-reanimated:packageReleaseAssets
> Task :react-native-safe-area-context:compileReleaseShaders NO-SOURCE
> Task :react-native-safe-area-context:generateReleaseAssets UP-TO-DATE
> Task :react-native-svg:mergeReleaseShaders
> Task :react-native-screens:mergeReleaseShaders
> Task :react-native-svg:compileReleaseShaders NO-SOURCE
> Task :react-native-svg:generateReleaseAssets UP-TO-DATE
> Task :react-native-screens:compileReleaseShaders NO-SOURCE
> Task :react-native-screens:generateReleaseAssets UP-TO-DATE
> Task :react-native-safe-area-context:packageReleaseAssets
> Task :react-native-svg:packageReleaseAssets
> Task :react-native-screens:packageReleaseAssets
> Task :react-native-async-storage_async-storage:generateReleaseBuildConfig
> Task :react-native-community_datetimepicker:generateReleaseBuildConfig
> Task :react-native-firebase_app:generateReleaseBuildConfig
> Task :react-native-async-storage_async-storage:javaPreCompileRelease
> Task :react-native-firebase_app:javaPreCompileRelease
> Task :react-native-community_datetimepicker:javaPreCompileRelease
> Task :react-native-async-storage_async-storage:compileReleaseJavaWithJavac
/home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/java/com/reactnativecommunity/asyncstorage/AsyncStorageModule.java:84: warning: [removal] onCatalystInstanceDestroy() in NativeModule has been deprecated and marked for removal
  public void onCatalystInstanceDestroy() {
              ^
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/javaPackage/java/com/reactnativecommunity/asyncstorage/AsyncStoragePackage.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
1 warning
> Task :react-native-community_datetimepicker:compileReleaseJavaWithJavac
> Task :react-native-firebase_app:compileReleaseJavaWithJavac
> Task :react-native-community_datetimepicker:mergeReleaseGeneratedProguardFiles
> Task :react-native-async-storage_async-storage:mergeReleaseGeneratedProguardFiles
> Task :react-native-community_datetimepicker:exportReleaseConsumerProguardFiles
> Task :react-native-async-storage_async-storage:exportReleaseConsumerProguardFiles
> Task :react-native-firebase_messaging:generateReleaseBuildConfig
> Task :react-native-firebase_app:mergeReleaseGeneratedProguardFiles
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
/home/expo/workingdir/build/node_modules/@react-native-firebase/app/android/src/reactnative/java/io/invertase/firebase/common/ReactNativeFirebaseModule.java:97: warning: [removal] onCatalystInstanceDestroy() in NativeModule has been deprecated and marked for removal
  public void onCatalystInstanceDestroy() {
              ^
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
1 warning
> Task :react-native-firebase_messaging:javaPreCompileRelease
> Task :expo:checkKotlinGradlePluginConfigurationErrors
> Task :react-native-firebase_app:exportReleaseConsumerProguardFiles
> Task :expo-asset:checkKotlinGradlePluginConfigurationErrors
> Task :expo:generateReleaseBuildConfig
> Task :expo-modules-core:checkKotlinGradlePluginConfigurationErrors
> Task :expo-modules-core:generateReleaseBuildConfig
> Task :expo-asset:generateReleaseBuildConfig
> Task :expo-asset:javaPreCompileRelease
> Task :expo-blur:checkKotlinGradlePluginConfigurationErrors
> Task :expo-blur:generateReleaseBuildConfig
> Task :expo-blur:javaPreCompileRelease
> Task :expo-constants:checkKotlinGradlePluginConfigurationErrors
> Task :expo-constants:generateReleaseBuildConfig
> Task :expo-constants:javaPreCompileRelease
> Task :expo-contacts:checkKotlinGradlePluginConfigurationErrors
> Task :react-native-firebase_app:bundleLibCompileToJarRelease
> Task :expo-contacts:generateReleaseBuildConfig
> Task :expo-contacts:javaPreCompileRelease
> Task :expo-crypto:checkKotlinGradlePluginConfigurationErrors
> Task :expo-crypto:generateReleaseBuildConfig
> Task :expo-crypto:javaPreCompileRelease
> Task :expo-dev-client:checkKotlinGradlePluginConfigurationErrors
> Task :react-native-firebase_messaging:compileReleaseJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
> Task :react-native-firebase_messaging:mergeReleaseGeneratedProguardFiles
> Task :react-native-firebase_messaging:exportReleaseConsumerProguardFiles
> Task :expo-dev-launcher:checkKotlinGradlePluginConfigurationErrors
> Task :expo-dev-client:dataBindingMergeDependencyArtifactsRelease
> Task :expo-modules-core:javaPreCompileRelease
> Task :expo-dev-launcher:dataBindingMergeDependencyArtifactsRelease
> Task :expo-dev-client:dataBindingGenBaseClassesRelease
> Task :expo-dev-client:generateReleaseBuildConfig
> Task :expo-dev-client:javaPreCompileRelease
> Task :expo-dev-menu:checkKotlinGradlePluginConfigurationErrors
> Task :expo-dev-menu:generateReleaseBuildConfig
> Task :expo-dev-menu-interface:checkKotlinGradlePluginConfigurationErrors
> Task :expo-dev-menu-interface:generateReleaseBuildConfig
> Task :expo-dev-menu-interface:javaPreCompileRelease
> Task :expo-json-utils:checkKotlinGradlePluginConfigurationErrors
> Task :expo-json-utils:generateReleaseBuildConfig
> Task :expo-json-utils:javaPreCompileRelease
> Task :expo-manifests:checkKotlinGradlePluginConfigurationErrors
> Task :expo-manifests:generateReleaseBuildConfig
> Task :expo-manifests:javaPreCompileRelease
> Task :expo-dev-menu:javaPreCompileRelease
> Task :expo-updates-interface:checkKotlinGradlePluginConfigurationErrors
> Task :expo-updates-interface:generateReleaseBuildConfig
> Task :expo-updates-interface:javaPreCompileRelease
> Task :expo-device:checkKotlinGradlePluginConfigurationErrors
> Task :expo-device:generateReleaseBuildConfig
> Task :expo-device:javaPreCompileRelease
> Task :expo-eas-client:checkKotlinGradlePluginConfigurationErrors
> Task :expo-eas-client:generateReleaseBuildConfig
> Task :expo-eas-client:javaPreCompileRelease
> Task :expo-file-system:checkKotlinGradlePluginConfigurationErrors
> Task :expo-file-system:generateReleaseBuildConfig
> Task :expo-file-system:javaPreCompileRelease
> Task :expo-font:checkKotlinGradlePluginConfigurationErrors
> Task :expo-font:generateReleaseBuildConfig
> Task :expo-font:javaPreCompileRelease
> Task :expo-image-loader:checkKotlinGradlePluginConfigurationErrors
> Task :expo-image-loader:generateReleaseBuildConfig
> Task :expo-image-loader:javaPreCompileRelease
> Task :expo-image-picker:checkKotlinGradlePluginConfigurationErrors
> Task :expo-image-picker:generateReleaseBuildConfig
> Task :expo-image-picker:javaPreCompileRelease
> Task :expo-keep-awake:checkKotlinGradlePluginConfigurationErrors
> Task :expo-keep-awake:generateReleaseBuildConfig
> Task :expo-keep-awake:javaPreCompileRelease
> Task :expo-linear-gradient:checkKotlinGradlePluginConfigurationErrors
> Task :expo-linear-gradient:generateReleaseBuildConfig
> Task :expo-dev-launcher:dataBindingGenBaseClassesRelease
> Task :expo-linear-gradient:javaPreCompileRelease
> Task :expo-location:checkKotlinGradlePluginConfigurationErrors
> Task :expo-dev-launcher:generateReleaseBuildConfig
> Task :expo-dev-launcher:javaPreCompileRelease
> Task :expo-secure-store:checkKotlinGradlePluginConfigurationErrors
> Task :expo-location:generateReleaseBuildConfig
> Task :expo-location:javaPreCompileRelease
> Task :expo-sharing:checkKotlinGradlePluginConfigurationErrors
> Task :expo-secure-store:generateReleaseBuildConfig
> Task :expo-sharing:generateReleaseBuildConfig
> Task :expo-secure-store:javaPreCompileRelease
> Task :expo-splash-screen:checkKotlinGradlePluginConfigurationErrors
> Task :expo-sharing:javaPreCompileRelease
> Task :expo-structured-headers:checkKotlinGradlePluginConfigurationErrors
> Task :expo-splash-screen:generateReleaseBuildConfig
> Task :expo-structured-headers:generateReleaseBuildConfig
> Task :expo-splash-screen:javaPreCompileRelease
> Task :expo-updates:checkKotlinGradlePluginConfigurationErrors
> Task :expo-structured-headers:javaPreCompileRelease
> Task :expo:javaPreCompileRelease
> Task :react-native-gesture-handler:checkKotlinGradlePluginConfigurationErrors
> Task :expo-updates:generateReleaseBuildConfig
> Task :react-native-gesture-handler:generateReleaseBuildConfig
> Task :react-native-reanimated:generateReleaseBuildConfig
> Task :react-native-reanimated:javaPreCompileRelease
> Task :react-native-reanimated:packageNdkLibs NO-SOURCE
> Task :expo-updates:javaPreCompileRelease
> Task :react-native-gesture-handler:javaPreCompileRelease
> Task :react-native-safe-area-context:checkKotlinGradlePluginConfigurationErrors
> Task :react-native-safe-area-context:generateReleaseBuildConfig
> Task :expo-modules-core:compileReleaseKotlin
> Task :react-native-reanimated:compileReleaseJavaWithJavac
> Task :react-native-reanimated:bundleLibCompileToJarRelease
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Some input files use unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :react-native-safe-area-context:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/java/com/th3rdwave/safeareacontext/SafeAreaContextPackage.kt:27:11 'constructor ReactModuleInfo(String!, String!, Boolean, Boolean, Boolean, Boolean, Boolean)' is deprecated. Deprecated in Java
w: file:///home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/java/com/th3rdwave/safeareacontext/SafeAreaContextPackage.kt:33:27 'hasConstants: Boolean' is deprecated. Deprecated in Java
w: file:///home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/java/com/th3rdwave/safeareacontext/SafeAreaView.kt:59:23 'getter for uiImplementation: UIImplementation!' is deprecated. Deprecated in Java
> Task :react-native-reanimated:mergeReleaseGeneratedProguardFiles
> Task :react-native-reanimated:exportReleaseConsumerProguardFiles
> Task :react-native-safe-area-context:javaPreCompileRelease
> Task :react-native-safe-area-context:compileReleaseJavaWithJavac
> Task :react-native-safe-area-context:mergeReleaseGeneratedProguardFiles
> Task :react-native-safe-area-context:exportReleaseConsumerProguardFiles
> Task :react-native-screens:checkKotlinGradlePluginConfigurationErrors
> Task :react-native-screens:generateReleaseBuildConfig
Note: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/paper/java/com/th3rdwave/safeareacontext/NativeSafeAreaContextSpec.java uses or overrides a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
> Task :app:createBundleReleaseJsAndAssets
Android Bundled 48397ms index.js (1724 modules)
Writing bundle output to: /home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle
Writing sourcemap output to: /home/expo/workingdir/build/android/app/build/intermediates/sourcemaps/react/release/index.android.bundle.packager.map
Copying 15 asset files
Done writing bundle output
Done writing sourcemap output
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:767:63: warning: Direct call to eval(), but lexical scope is not supported.
...typeof expo === "undefined" ? eval("require") : function (moduleId) {
                                 ^~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:3407:16: warning: the variable "SharedArrayBuffer" was not declared in function "from"
    if (typeof SharedArrayBuffer !== 'undefined' && (isInstance(value, Shared...
               ^~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:7399:18: warning: the variable "DebuggerInternal" was not declared in function "__shouldPauseOnThrow"
          typeof DebuggerInternal !== 'undefined' &&
                 ^~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:19605:7: warning: the variable "setTimeout" was not declared in function "logCapturedError"
      setTimeout(function () {
      ^~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:17715:31: warning: the variable "nativeFabricUIManager" was not declared in anonymous function " 375#"
  var _nativeFabricUIManage = nativeFabricUIManager,
                              ^~~~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:17743:21: warning: the variable "clearTimeout" was not declared in anonymous function " 375#"
    cancelTimeout = clearTimeout;
                    ^~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:22373:30: warning: the variable "__REACT_DEVTOOLS_GLOBAL_HOOK__" was not declared in anonymous function " 375#"
  if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
                             ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:23928:5: warning: the variable "setImmediate" was not declared in function "handleResolved"
    setImmediate(function () {
    ^~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:27961:5: warning: the variable "fetch" was not declared in anonymous function " 589#"
    fetch,
    ^~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:27962:5: warning: the variable "Headers" was not declared in anonymous function " 589#"
    Headers,
    ^~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:27963:5: warning: the variable "Request" was not declared in anonymous function " 589#"
    Request,
    ^~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:27964:5: warning: the variable "Response" was not declared in anonymous function " 589#"
    Response
    ^~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:28121:24: warning: the variable "FileReader" was not declared in function "readBlobAsArrayBuffer"
      var reader = new FileReader();
                       ^~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:28172:36: warning: the variable "Blob" was not declared in anonymous function " 600#"
        } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
                                   ^~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:28174:40: warning: the variable "FormData" was not declared in anonymous function " 600#"
        } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
                                       ^~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:28176:44: warning: the variable "URLSearchParams" was not declared in anonymous function " 600#"
...e if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body...
                                 ^~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:28295:26: warning: the variable "AbortController" was not declared in anonymous function " 606#"
          var ctrl = new AbortController();
                         ^~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:28429:23: warning: the variable "XMLHttpRequest" was not declared in anonymous function " 610#"
        var xhr = new XMLHttpRequest();
                      ^~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:27974:71: warning: the variable "self" was not declared in anonymous function " 592#"
...undefined' && globalThis || typeof self !== 'undefined' && self ||
                                      ^~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:31964:27: warning: the variable "performance" was not declared in anonymous function " 767#"
  if ("object" === typeof performance && "function" === typeof performance.no...
                          ^~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:31987:26: warning: the variable "navigator" was not declared in anonymous function " 767#"
  "undefined" !== typeof navigator && undefined !== navigator.scheduling && u...
                         ^~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:32097:37: warning: the variable "MessageChannel" was not declared in anonymous function " 767#"
  };else if ("undefined" !== typeof MessageChannel) {
                                    ^~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:32112:34: warning: the variable "nativeRuntimeScheduler" was not declared in anonymous function " 767#"
... = "undefined" !== typeof nativeRuntimeScheduler ? nativeRuntimeScheduler....
                             ^~~~~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:43878:34: warning: the variable "requestAnimationFrame" was not declared in function "start 9#"
...    this._animationFrame = requestAnimationFrame(this.onUpdate.bind(this));
                              ^~~~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:68055:100: warning: the variable "location" was not declared in function "registerSensor 1#"
...(0, _PlatformChecker.isWeb)() && location.protocol !== 'https:' ? ' Make s...
                                    ^~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:69892:26: warning: Direct call to eval(), but lexical scope is not supported.
            workletFun = eval('(' + initData.code + '\n)');
                         ^~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:69915:112: warning: the variable "_toString" was not declared in function "valueUnpacker"
...recognized by value unpacker: "${_toString(objectToUnpack)}".`);
                                    ^~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:70769:11: warning: the variable "queueMicrotask" was not declared in anonymous function " 1813#"
          queueMicrotask(function () {
          ^~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:70895:33: warning: the variable "_WORKLET" was not declared in function "runOnJS"
      if (SHOULD_BE_USE_WEB || !_WORKLET) {
                                ^~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:87675:26: warning: the variable "structuredClone" was not declared in function "createAnimationWithExistingTransform"
      newAnimationData = structuredClone(_config.AnimationsData[animationName]);
                         ^~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:87873:5: warning: the variable "document" was not declared in function "configureWebLayoutAnimations"
    document.getElementById(PREDEFINED_WEB_ANIMATIONS_ID) !== null) {
    ^~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:87969:27: warning: the variable "HTMLElement" was not declared in function "findDescendantWithExitingAnimation"
    if (!(node instanceof HTMLElement)) {
                          ^~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:87995:24: warning: the variable "MutationObserver" was not declared in function "addHTMLMutationObserver"
    var observer = new MutationObserver(function (mutationsList) {
                       ^~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:88044:41: warning: the variable "getComputedStyle" was not declared in function "fixElementPosition"
...entBorderTopValue = parseInt(getComputedStyle(parent).borderTopWidth);
                                ^~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:92395:5: warning: the variable "jest" was not declared in function "beforeTest"
    jest.useFakeTimers();
    ^~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:92930:26: warning: the variable "_getAnimationTimestamp" was not declared in function "computeEasingProgress"
      var elapsedTime = (_getAnimationTimestamp() - startingTimestamp) / 1000;
                         ^~~~~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:154955:18: warning: the variable "FinalizationRegistry" was not declared in function "initializeServerApp"
      if (typeof FinalizationRegistry === 'undefined') {
                 ^~~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:158826:29: warning: the variable "IDBDatabase" was not declared in function "getMethod"
    if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop =...
                            ^~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:158835:37: warning: the variable "IDBIndex" was not declared in function "getMethod"
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || ...
                                    ^~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:158835:48: warning: the variable "IDBObjectStore" was not declared in function "getMethod"
...ame in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || r...
                                 ^~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:158889:94: warning: the variable "IDBCursor" was not declared in function "getIdbProxyableTypes"
...abase, IDBObjectStore, IDBIndex, IDBCursor, IDBTransaction]);
                                    ^~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:158889:105: warning: the variable "IDBTransaction" was not declared in function "getIdbProxyableTypes"
...ctStore, IDBIndex, IDBCursor, IDBTransaction]);
                                 ^~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:159036:26: warning: the variable "IDBRequest" was not declared in function "wrap 1#"
    if (value instanceof IDBRequest) return promisifyRequest(value);
                         ^~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:264588:5: warning: the property "profilePictureContainer" was set multiple times in the object definition.
    profilePictureContainer: {
    ^~~~~~~~~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:264573:5: note: The first definition was here.
    profilePictureContainer: {
    ^~~~~~~~~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:264787:5: warning: the property "contactContainer" was set multiple times in the object definition.
    contactContainer: {
    ^~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:264660:5: note: The first definition was here.
    contactContainer: {
    ^~~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:272705:5: warning: the property "loadingText" was set multiple times in the object definition.
    loadingText: {
    ^~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:272599:5: note: The first definition was here.
    loadingText: {
    ^~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:272797:5: warning: the property "sectionSubtitle" was set multiple times in the object definition.
    sectionSubtitle: {
    ^~~~~~~~~~~~~~~~~~
/home/expo/workingdir/build/android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle:272666:5: note: The first definition was here.
    sectionSubtitle: {
    ^~~~~~~~~~~~~~~~~~
> Task :react-native-gesture-handler:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/RNGestureHandlerPackage.kt:69:42 'constructor ReactModuleInfo(String!, String!, Boolean, Boolean, Boolean, Boolean, Boolean)' is deprecated. Deprecated in Java
w: file:///home/expo/workingdir/build/node_modules/react-native-gesture-handler/android/src/main/java/com/swmansion/gesturehandler/core/FlingGestureHandler.kt:25:26 Parameter 'event' is never used
> Task :react-native-gesture-handler:compileReleaseJavaWithJavac
> Task :react-native-gesture-handler:mergeReleaseGeneratedProguardFiles
> Task :react-native-gesture-handler:exportReleaseConsumerProguardFiles
> Task :react-native-screens:javaPreCompileRelease
> Task :react-native-svg:generateReleaseBuildConfig
> Task :react-native-svg:javaPreCompileRelease
> Task :app:generateCodegenSchemaFromJavaScript SKIPPED
> Task :app:generateCodegenArtifactsFromSchema SKIPPED
> Task :app:generatePackageList
> Task :app:preBuild
> Task :app:preReleaseBuild
> Task :app:generateReleaseResValues
> Task :app:processReleaseGoogleServices
> Task :react-native-svg:compileReleaseJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: Some input files use unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :react-native-screens:compileReleaseKotlin FAILED
e: file:///home/expo/workingdir/build/node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/safearea/SafeAreaView.kt:109:13 Operator '!=' cannot be applied to 'Insets' and 'EdgeInsets'
> Task :app:mapReleaseSourceSetPaths
> Task :expo-modules-core:compileReleaseKotlin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/permissions/PermissionsService.kt:20:26 'Promise' is deprecated. AsyncFunction will crash when called. Use expo.modules.kotlin.Promise instead
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/permissions/PermissionsService.kt:63:51 'Promise' is deprecated. AsyncFunction will crash when called. Use expo.modules.kotlin.Promise instead
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/permissions/PermissionsService.kt:90:54 'Promise' is deprecated. AsyncFunction will crash when called. Use expo.modules.kotlin.Promise instead
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/defaultmodules/CoreModule.kt:6:34 'ReactFeatureFlags' is deprecated. Deprecated in Java
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/defaultmodules/CoreModule.kt:70:12 'ReactFeatureFlags' is deprecated. Deprecated in Java
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/events/KModuleEventEmitterWrapper.kt:97:7 'constructor Event<T : Event<(raw) Event<*>>!>(Int)' is deprecated. Deprecated in Java
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/types/JSTypeConverterHelper.kt:44:17 'get(String!): Any?' is deprecated. Deprecated in Java
FAILURE: Build failed with an exception.
* What went wrong:
Execution failed for task ':react-native-screens:compileReleaseKotlin'.
> A failure occurred while executing org.jetbrains.kotlin.compilerRunner.GradleCompilerRunnerWithWorkers$GradleKotlinCompilerWorkAction
   > Compilation error. See log for more details
* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.
BUILD FAILED in 3m 39s
Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.
You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.
For more on this, please refer to https://docs.gradle.org/8.8/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.
535 actionable tasks: 535 executed
Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.