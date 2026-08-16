# Shovot Carton — VPS ga joylash qo'llanmasi

Ushbu hujjat loyihani VPS (Ubuntu/Debian) ga ishga tushirish, haqiqiy ishxona koordinatasini o'rnatish va keyinchalik yangitdan tahrirlashni ko'rsatadi.

Tarkib:

- Talablar (VPS da qanday dasturlar o'rnatiladi)
- Kodni olish va bog'liqliklarni o'rnatish
- Ma'lumotlar bazasini ko'chirish (hodimlar yuzlari bilan birga)
- API serverini ishga tushirish (systemd orqali — doim ishlaydi)
- Web (admin panel) + HTTPS (nginx)
- Mobil (Expo) ni VPS ga ulash
- Ishxona koordinatasi va radiusni o'rnatish / keyin o'zgartirish
- Backup, loglar va foydali buyruqlar

---

## 1. Talablar

VPS da quyidagilar o'rnatilgan bo'lishi kerak:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl
```

**Node.js 20+ + pnpm:**

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pnpm
```

**Docker (PostgreSQL uchun):**

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker   # keyin qayta login
```

---

## 2. Kodni olish

```bash
mkdir -p /opt/carton && cd /opt/carton
git clone git@github.com:Shoxrux-96/carton.git .   # yoki
# git clone https://github.com/Shoxrux-96/carton.git .
pnpm install
```

server papkasi: `artifacts/api-server`, admin panel: `artifacts/ishlab-chiqarish`, mobil: `artifacts/mobile`.

---

## 3. PostgreSQL va bazani ko'chirish

Yangi bo'sh bazani ishga tushiring:

```bash
docker run -d --name carton-postgres --restart unless-stopped \
  -p 5432:5432 \
  -e POSTGRES_USER=carton \
  -e POSTGRES_PASSWORD=typesi-parol \
  -e POSTGRES_DB=carton \
  -v carton-data:/var/lib/postgresql/data \
  postgres:16
```

> **Muhim:** Local kompyuteringizdagi bazani dumplab, VPS ga olib kiring. Shunda hozirgi
> hodimlar, ularning **ro'yxatdan o'tgan yuzlari** va davomat tarixi birga ko'chadi (qayta
> ro'yxatdan o'tish shart emas).

Local kompyuterda (baza hozir ishlab turgan joyda):

```bash
docker exec carton-postgres pg_dump -U carton -d carton > /tmp/carton-dump.sql   # local (loyiha papkasida emas!)
scp /tmp/carton-dump.sql root@YOUR_VPS:/tmp/
```

VPS da:

```bash
docker exec -i carton-postgres psql -U carton -d carton < /tmp/carton-dump.sql
rm /tmp/carton-dump.sql
```

> Yuz suratlari va descriptor'lar **bazaning o'zida** saqlanadi — alohida fayl ko'chirish shart emas.

Tabgeya yuklanishini tekshiring:

```bash
docker exec carton-postgres psql -U carton -d carton -c "SELECT id, name, length(face_descriptor) FROM employees;"
```

---

## 4. API serveri (systemd — doim ishlaydi)

Server `artifacts/api-server` papkasida ishlaydi. Parol (muhit o'zgaruvchilari) uchun fayl yarating:

```bash
sudo mkdir -p /etc/carton
sudo tee /etc/carton/api-server.env > /dev/null <<'EOF'
PORT=3003
DATABASE_URL=postgresql://carton:typesi-parol@localhost:5432/carton
JWT_SECRET=bu_yerga_uzun_tasodifiy_parol_yozing
NODE_ENV=production
EOF
```

`JWT_SECRET` ni kuchliroq qiymatga almashtiring. Ishlash joyi (`cwd`) **`artifacts/api-server`** bo'lishi kerak — chunki u `office-settings.json`, `client-error.log` va `models/` ni shu papkadan qidiradi.

Systemd xizmati yarating `/etc/systemd/system/carton-api.service`:

```ini
[Unit]
Description=Carton ERP API
After=network.target docker.service

[Service]
EnvironmentFile=/etc/carton/api-server.env
WorkingDirectory=/opt/carton/artifacts/api-server
ExecStart=/usr/bin/pnpm --filter @workspace/api-server run dev
Restart=always
RestartSec=3
User=root
StandardOutput=append:/var/log/carton-api.log
StandardError=append:/var/log/carton-api.log

[Install]
WantedBy=multi-user.target
```

Ishga tushirish:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now carton-api
sleep 10
curl http://localhost:3003/api/healthz        # {"status":"ok"} bo'lishi kerak
```

---

## 5. Web (admin panel) + nginx + HTTPS

Web'ni build qiling:

```bash
cd /opt/carton/artifacts/ishlab-chiqarish
pnpm run build          # dist/ papkasiga chiqadi
```

nginx o'rnating va konfiguratsiya yarating:

```bash
sudo apt install -y nginx
```

`/etc/nginx/sites-available/carton`:

```nginx
server {
    listen 80;
    server_name kartoningiz.com www.kartoningiz.com;

    root /opt/carton/artifacts/ishlab-chiqarish/dist;
    index index.html;

    # SPA yönlendirme
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API ni serverga yo'naltirish
    location /api/ {
        proxy_pass http://127.0.0.1:3003;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 20m;      # yuz surati yuklash uchun
        proxy_read_timeout 120s;       # yuz ishlash biroz vaqt oladi
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/carton /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx
```

**HTTPS (kameral uchun tavsiya):**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d kartoningiz.com -d www.kartoningiz.com
```

> HTTPS muhim: ba'zi brauzerlar kamerani faqat `https://` da ruxsat beradi.

---

## 6. Mobil (Expo) — telefon bilan ishlatish

### Tez variant (Expo Go orqali test)

Expo Metro'ni VPS da ishga tushiring:

```bash
cd /opt/carton/artifacts/mobile
CI=1 EXPO_PACKAGER_HOSTNAME=$(curl -s ifconfig.me) pnpm run start --port 8085
```

Telefonga **Expo Go** o'rnatib: `exp://YOUR_VPS_IP:8085` ga ulaning.
Mobil app API manzilini Expo manzilidan o'zi topadi (`src/api.ts`) — `VPS_IP:3003` ga ishora qiladi.
Portlarni ochiq qilish: `3003`, `8085` (VPS firewall'da).

> 8085 tashqariga ochiq tursa Metro xavfsizlik emas — **test uchungina** foydalaning.

### Ishlab chiqarish variant (APK — tavsiya)

Expo EAS build bilan APK quring va mobil kirish manzilini o'rnating:

```bash
cd /opt/carton/artifacts/mobile
EXPO_PUBLIC_API_URL=https://kartoningiz.com/api eas build --platform android --profile production
```

> Hozirgi kodda `EXPO_PUBLIC_API_URL` hali qo'llanilmaydi — mobil `API_BASE` ni Expo
> manzilidan oladi. APK uchun `src/api.ts` ga quyidagini qo'shish kerak:
>
> ```ts
> const API_BASE = process.env.EXPO_PUBLIC_API_URL || `http://${host}:3003/api`;
> ```
>
> Keyin API HTTPS bo'lsa, mobil ham https orqali ishlaydi.

---

## 7. Ishxona koordinatasi va radius — o'rnatish va keyin o'zgartirish

### A) Brauzer orqali (eng oson — doim ishlaydi)

1. Admin panelga kirin: `https://kartoningiz.com` → `admin` `998995054004` / `admin12345`
2. **Ishlab chiqarish → Davomat → Sozlamalar** bo'limi
3. Suhbatda:
   - **Karta** — xaritada ishxonangizga bosib belgilang (marker harakatlanishi mumkin)
   - **"Men hozir shu yerdamda"** tugmasi — koordinatani avtomatik GPS'dan o'qiydi (ishxonada turib)
   - **Kenglik / Uzunlik** maydonlari — qo'lda yozish mumkin
   - **Radius (m)** — necha metr doirada davomat qabul etilsin (masalan `25`)
4. O'zgarish avtomatik serverga `PUT /api/settings` orqali yoziladi (`office-settings.json`)

> **Ishxona boshqa joyga ko'chsa** — xuddi shu sahifaga qaytib, yangi koordinatani
> belgilang. Radiusni ham ulgaytirish mumkin (masalan `50`). Saqlangan_o qiymat
> avtomatik server tomonidan ishlatila boshlaydi — restart shart emas.

### B) Faylni qo'lda tahrirlash

`/opt/carton/artifacts/api-server/office-settings.json`:

```json
{
  "lat": 41.311081,
  "lng": 69.240562,
  "radius": 25,
  "startTime": "09:00",
  "endTime": "18:00",
  "lateMinutes": 30
}
```

- `lat`/`lng` — ishxonaning haqiqiy koordinatasi (Google Maps'da ishxonaga bosib oling)
- `radius` — metrlarda, davomat qabul qilinadigan doira
- O'zgartirilgandan so'ng `sudo systemctl restart carton-api` qiling

**Sinov:** telefon ishxonada turib, Davomat → Face ID da yuzni ovalga qarating:
agar "Ishxonadan uzoqdasiz" chiqsa — koordinata noto'g'ri yoki radius kichik.

---

## 8. Backup, loglar, foydali buyruqlar

### Kundalik backup (cron)

```bash
crontab -e
```

```cron
0 3 * * * docker exec carton-postgres pg_dump -U carton -d carton | gzip > /var/backups/carton-(date +%F).sql.gz
# 30 kundan eski zaxiralarni o'chirish (bitta qatorga chiqarish uchun):
# 0 4 * * * find /var/backups -name "carton-*.sql.gz" -mtime +30 -delete
```

Restore:

```bash
gunzip -c /var/backups/carton-2026-08-16.sql.gz | docker exec -i carton-postgres psql -U carton -d carton
```

### Loglar

| Qayer | Nima |
|---|---|
| `/var/log/carton-api.log` | Server log (barcha xatolar) |
| `/opt/carton/artifacts/api-server/client-error.log` | Mobil telefonda tushgan xatolar |
| `/var/log/nginx/error.log` | Web / proxy xatolar |

Face ID xatosi chiqsa, avval `client-error.log` ni, yo'q bo'lsa `carton-api.log` ni ko'ring.

### Asosiy buyruqlar

```bash
sudo systemctl restart carton-api     # API'ni qayta ishga tushirish
sudo systemctl status carton-api
sudo journalctl -u carton-api -f      # jonli log
docker restart carton-postgres        # bazani qayta ishga tushirish
sudo systemctl restart nginx
```

---

## Tekshiruv ro'yxati

- [ ] `curl http://localhost:3003/api/healthz` → `ok`
- [ ] `https://kartoningiz.com` ochiladi, login ishlaydi
- [ ] Davomat → Sozlamalar → xaritanu bo'sh emas, radius `25` m
- [ ] Telefon Expo Go orqali `exp://VPS_IP:8085` da ochiladi
- [ ] Face ID: telefon ishxonada — davomat belgilanadi; masofadan — "Ishxonadan uzoqdasiz"
- [ ] Yuklangan hodim yuzi ("ro'yxatdan o'tkazish") ishlaydi