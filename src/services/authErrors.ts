// Lỗi đăng nhập / liên kết email của Firebase → câu dễ hiểu.
export function authErrorText(code?: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email hoặc mật khẩu chưa đúng.';
    case 'auth/invalid-email':
      return 'Email chưa đúng dạng (vd: ten@gmail.com).';
    case 'auth/too-many-requests':
      return 'Thử sai nhiều lần quá. Chờ vài phút rồi thử lại.';
    case 'auth/network-request-failed':
      return 'Chưa kết nối được. Kiểm tra mạng rồi thử lại.';
    case 'auth/operation-not-allowed':
      return 'Chức năng đăng nhập email chưa được bật trên máy chủ (người quản lý app cần bật).';
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'Email này đã được dùng cho một tài khoản khác.';
    case 'auth/weak-password':
      return 'Mật khẩu cần ít nhất 8 ký tự.';
    case 'auth/provider-already-linked':
      return 'Máy này đã liên kết email rồi.';
    default:
      return 'Chưa làm được. Thử lại sau nhé.';
  }
}
