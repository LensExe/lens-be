/**
 * Khả năng gán / gỡ role `photographer` trên Keycloak mà context photographer cần khi admin duyệt hồ sơ.
 *
 * Bên cung cấp: identity (xem `docs/IDENTITY_TODO.md`, việc 7). Trong lúc chờ, wiring bằng bản no-op.
 * User phải refresh token / đăng nhập lại để token có role mới.
 */
export abstract class PhotographerRolePort {
  /**
   * Gán realm role `photographer` cho user.
   *
   * @param keycloakUserId ID user bên Keycloak (`users.keycloak_id`)
   * @returns Promise hoàn tất khi đã gán
   */
  abstract grant(keycloakUserId: string): Promise<void>;

  /**
   * Gỡ realm role `photographer` khỏi user.
   *
   * @param keycloakUserId ID user bên Keycloak (`users.keycloak_id`)
   * @returns Promise hoàn tất khi đã gỡ
   */
  abstract revoke(keycloakUserId: string): Promise<void>;
}
