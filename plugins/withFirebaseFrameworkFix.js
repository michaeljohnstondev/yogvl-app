// @react-native-firebase v22+ wraps native modules in framework modules.
// With use_frameworks! :linkage => :static, those modules include React-Core
// headers that aren't part of a clang module, which triggers
// `-Werror,-Wnon-modular-include-in-framework-module` and breaks the iOS build.
//
// The fix is to set CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES = YES
// on every Pod target. This config plugin appends that to the Podfile's
// post_install block during prebuild.

const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TAG_START = '# BEGIN withFirebaseFrameworkFix';
const TAG_END = '# END withFirebaseFrameworkFix';

const FIX_BLOCK = `
    ${TAG_START}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end
    ${TAG_END}`;

function injectFix(podfile) {
  if (podfile.includes(TAG_START)) {
    return podfile;
  }

  // Inject into an existing `post_install do |installer|` block if present.
  const postInstallMatch = podfile.match(/post_install do \|installer\|\n/);
  if (postInstallMatch) {
    const insertAt = postInstallMatch.index + postInstallMatch[0].length;
    return podfile.slice(0, insertAt) + FIX_BLOCK + '\n' + podfile.slice(insertAt);
  }

  // No existing block — append a new one at the end of the file.
  return `${podfile}\n\npost_install do |installer|${FIX_BLOCK}\nend\n`;
}

module.exports = function withFirebaseFrameworkFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (innerConfig) => {
      const podfilePath = path.join(
        innerConfig.modRequest.platformProjectRoot,
        'Podfile'
      );
      const original = fs.readFileSync(podfilePath, 'utf-8');
      fs.writeFileSync(podfilePath, injectFix(original));
      return innerConfig;
    },
  ]);
};
