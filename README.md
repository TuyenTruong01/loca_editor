# Loca Editor Frontend

Frontend React dùng chung cho Video Editor và Document Editor.

## Chạy frontend

```powershell
npm install
npm run dev
```

## Thiết lập và chạy hai backend cục bộ

Chạy thiết lập một lần:

```powershell
.\setup-backends.cmd
```

Khởi động hai backend:

```powershell
.\start-backends.cmd
```

Nếu frontend được mở từ một domain khác, truyền domain đó để CORS cho phép truy cập:

```powershell
.\start-backends.cmd -FrontendOrigin "https://TEN-TAI-KHOAN.github.io"
```

Dừng backend:

```powershell
.\stop-backends.cmd
```

Các môi trường Python và log được tạo trong `.runtime/` và không được đưa lên GitHub.

## GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` tự build và triển khai khi push lên nhánh `main`.

Trong GitHub repository:

1. Mở **Settings → Pages** và chọn **GitHub Actions**.
2. Mở **Settings → Secrets and variables → Actions → Variables**.
3. Tạo `VITE_VIDEO_API_BASE` và `VITE_DOCUMENT_API_BASE` nếu backend đã được triển khai công khai.

GitHub Pages chỉ host frontend tĩnh. Backend FastAPI không chạy trên GitHub Pages; để người khác sử dụng các chức năng xử lý, hai backend phải được triển khai tại địa chỉ HTTPS công khai.
