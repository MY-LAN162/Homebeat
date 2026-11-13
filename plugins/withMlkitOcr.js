// Android: báo Google Play services tải sẵn mô hình đọc chữ (ML Kit OCR) khi cài app,
// để lần quét đơn thuốc đầu tiên không phải chờ tải mô hình (hoặc báo lỗi khi đang tải).
// https://developers.google.com/ml-kit/vision/text-recognition/v2/android
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

module.exports = function withMlkitOcr(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(app, 'com.google.mlkit.vision.DEPENDENCIES', 'ocr');
    return cfg;
  });
};
