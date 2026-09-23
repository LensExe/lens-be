/**
 * Tách fullname thành firstName và lastName cho Keycloak.
 * Để đảm bảo khi Keycloak ghép chuỗi `${firstName} ${lastName}` (theo chuẩn OpenID Connect claim `name`)
 * không bị đảo ngược thứ tự tên tiếng Việt:
 * - firstName: họ và tên đệm (các từ đầu)
 * - lastName: tên chính (từ cuối cùng)
 * Ví dụ: "Nguyễn Văn A" -> firstName: "Nguyễn Văn", lastName: "A"
 *        "John Doe"     -> firstName: "John",       lastName: "Doe"
 */

export interface SeparateFullname {
  firstName?: string;
  lastName?: string;
}

export const SeparateFullname = (fullname?: string): SeparateFullname => {
  if (!fullname) {
    return {};
  }
  const parts = fullname.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return {};
  }
  if (parts.length === 1) {
    return { firstName: parts[0] };
  }
  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
};
