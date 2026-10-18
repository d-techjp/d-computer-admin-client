/**
 * Thông tin cửa hàng hiển thị ở footer storefront — bản ghi singleton (chỉ một
 * dòng), không có `id` truyền tay: `GET`/`PATCH /admin/site-settings` luôn thao
 * tác trên đúng một bản ghi đó.
 */
export interface SocialLink {
  /** Rỗng khi mới thêm ở form, chưa lưu — server tự sinh id lúc PATCH thành công. */
  id?: string;
  name: string;
  logoUrl: string;
  url: string;
}

export interface FooterLink {
  /** Rỗng khi mới thêm ở form, chưa lưu — server tự sinh id lúc PATCH thành công. */
  id?: string;
  label: string;
  /** Path nội bộ storefront (vd `/products`) hoặc URL ngoài — để trống nếu chưa có trang đích. */
  url: string;
}

export interface FooterColumn {
  id?: string;
  title: string;
  links: FooterLink[];
}

export interface SiteSettings {
  companyName: string;
  phone: string;
  address: string;
  /** Số đăng ký インボイス (T + 13 số) in trên bill; rỗng = chưa đăng ký */
  invoiceRegistrationNumber: string;
  socialLinks: SocialLink[];
  footerColumns: FooterColumn[];
}
