// Cấu hình bổ sung cho app.json khi build bản cài.
// - Có file cấu hình Firebase (google-services.json cho Android, GoogleService-Info.plist cho iPhone) thì bật
//   React Native Firebase + App Check. File này KHÔNG đưa lên GitHub (repo công khai): để ở thư mục gốc khi build
//   trên máy, hoặc khai báo biến môi trường dạng file trên EAS (GOOGLE_SERVICES_JSON, GOOGLE_SERVICE_INFO_PLIST).
// - Không có file thì app vẫn build được và chạy một máy (không đồng bộ).
const fs = require('fs');

module.exports = ({ config }) => {
  const android = process.env.GOOGLE_SERVICES_JSON || './google-services.json';
  const ios = process.env.GOOGLE_SERVICE_INFO_PLIST || './GoogleService-Info.plist';
  const hasAndroid = fs.existsSync(android);
  const hasIos = fs.existsSync(ios);
  const plugins = [...(config.plugins || [])];
  if (hasAndroid || hasIos) {
    plugins.push('@react-native-firebase/app', '@react-native-firebase/auth', '@react-native-firebase/app-check');
  }
  // React Native Firebase trên iPhone cần thư viện dạng "static framework".
  plugins.push(['expo-build-properties', { ios: { useFrameworks: 'static' } }]);
  return {
    ...config,
    plugins,
    android: { ...config.android, ...(hasAndroid ? { googleServicesFile: android } : {}) },
    ios: { ...config.ios, ...(hasIos ? { googleServicesFile: ios } : {}) },
  };
};
