---
name: frontend-senior-style
description: Panduan wajib dipakai setiap kali membuat atau mengubah UI frontend (Next.js, React, Shadcn/ui, Tailwind, atau HTML/CSS biasa). Tujuannya bikin hasil UI terasa dikerjakan manual oleh senior frontend/UI-UX developer berpengalaman, BUKAN hasil generate AI generik. Trigger di setiap task: "buatkan landing page", "redesign dashboard", "styling komponen", "buat UI untuk...", atau task apapun yang menghasilkan tampilan visual (komponen React, halaman Next.js, admin panel, dashboard saham, dsb).
---

# Frontend Senior Style — Anti "AI-Generated Look"

Kamu bukan bikin demo, kamu bikin produk yang harus terasa **punya identitas**, seolah dikerjakan satu orang senior FE/UI-UX yang paham betul konteks bisnisnya (properti, saham, atau SaaS undangan). Setiap keputusan visual harus bisa dijustifikasi, bukan default template.

## 1. Ciri "AI style" yang WAJIB DIHINDARI

Kenali dulu pola generik yang langsung ketahuan buatan AI, lalu jangan lakukan:

- **Palet template**: gradient ungu-biru (`#667eea → #764ba2`), atau krem hangat + serif + aksen terracotta (`#D97757`), atau dark mode dengan satu aksen neon hijau/vermillion. Kalau brief tidak minta salah satu dari ini secara eksplisit, jangan pakai.
- **Border-radius seragam di semua elemen** (semua card/button pakai `rounded-xl` tanpa alasan) — bikin flat, tidak ada hierarki.
- **Glassmorphism / backdrop-blur berlebihan** di semua card tanpa alasan fungsional.
- **Emoji sebagai icon** di UI produksi (📊 💰 🚀) — pakai icon set nyata (lucide-react, phosphor, heroicons).
- **Semua section centered + max-w-container + padding sama rata** dari atas sampai bawah — bikin halaman terasa monoton, tidak ada ritme.
- **Shadow generik** (`shadow-lg` Tailwind default di semua card) tanpa disesuaikan dengan brand.
- **Copy generik**: "Unlock your potential", "Powerful features for modern teams", headline yang tidak spesifik ke bisnis nyata (properti Coruna Hills, saham IDX, dsb).
- **Animasi random**: fade-in semua elemen dengan delay stagger 0.1s tanpa tujuan naratif.
- **Font Inter untuk semuanya** — heading dan body pakai font yang sama tanpa kontras.
- **Icon 3 kartu fitur dengan angka 01/02/03** padahal isinya bukan urutan proses.

## 2. Sebelum ngoding: tentukan token & alasan bisnisnya

Jangan langsung tulis JSX/CSS. Tentukan dulu (boleh singkat, di comment atau chat):

1. **Konteks nyata**: ini untuk apa? (mis. dashboard analitik saham dengan candlestick, landing page Coruna Hills, admin panel booking kavling). Ambil kosakata dan nuansa dari domain itu — properti terasa "grounded, trustworthy, navy/teal", saham terasa "data-dense, presisi, monospace untuk angka".
2. **Palet warna 4-6 hex spesifik** — kalau sudah ada brand (mis. Coruna Realty: Dark Navy `#1A2E44`, Teal `#0D7A8C`, White), turunkan dari situ, jangan re-invent. Kalau belum ada brand, pilih warna yang masuk akal untuk domainnya, bukan default AI.
3. **Tipografi 2 role minimal**: display/heading yang punya karakter (bukan Inter polos) + body yang nyaman dibaca. Untuk dashboard data/saham, pertimbangkan monospace (`JetBrains Mono`, `IBM Plex Mono`) khusus untuk angka/harga.
4. **Layout concept 1 kalimat** — bukan "hero + 3 feature cards + footer" default, tapi sesuatu yang spesifik ke kontennya.
5. **Satu signature element** — satu hal yang bikin halaman ini beda dari template lain (bisa berupa micro-interaction spesifik, layout asimetris, cara nampilin data candlestick, dsb).

## 3. Prinsip eksekusi

- **Hierarki lewat densitas, bukan seragam.** Section hero boleh lega (banyak whitespace), section data/tabel boleh padat. Jangan paksa semua section punya padding vertikal yang sama.
- **Asimetri yang disengaja.** Grid tidak harus selalu 3 kolom rata. Coba layout 2 kolom dengan proporsi 60/40, atau elemen yang overlap dengan sengaja.
- **Warna aksen dipakai pelit.** Satu warna aksen untuk CTA/highlight, sisanya netral (grayscale/navy). Jangan semua button, badge, border pakai warna aksen sekaligus.
- **Border-radius punya sistem**, bukan satu nilai global: misal card besar `rounded-lg`, button `rounded-md`, badge/pill `rounded-full` — variasi kecil yang konsisten sesuai skala elemen, bukan sama rata.
- **Shadow dan border pilih salah satu sebagai bahasa utama.** Style "flat + border tipis" (ala fintech/dashboard) atau "soft shadow tanpa border" (ala consumer app) — jangan campur random di tiap komponen.
- **Motion secukupnya dan bermakna**: transisi hover (150-200ms ease-out) untuk feedback, scroll-reveal hanya untuk elemen penting (bukan semua paragraf), skip animasi kalau tidak menambah pemahaman.
- **Empty state, error state, loading state dirancang, bukan ditinggal default browser.** Terutama untuk dashboard (data saham kosong, kavling belum terisi, dsb) — kasih pesan yang actionable sesuai domain.
- **Copy spesifik ke bisnis nyata.** Untuk Coruna Realty: sebut nama cluster, lokasi (Banjarbaru/Sekumpul), bukan "properti impian Anda" generik. Untuk dashboard saham: sebut ticker, metrik nyata (RSI, MA20, volume), bukan "insight powerful".
- **Perhatikan CSS specificity** saat pakai Tailwind + custom class — jangan sampai class section vs class komponen saling override tanpa sengaja (terutama padding/margin antar section).

## 4. Untuk stack Mun spesifik (Next.js 14 App Router + Shadcn/ui + Tailwind)

- Shadcn/ui itu titik awal, bukan tujuan akhir — selalu override token warna (`tailwind.config`, CSS variables di `globals.css`) sesuai brand, jangan pakai default zinc/slate + primary biru Shadcn apa adanya.
- Untuk dashboard data (saham/candlestick, analitik properti): pisahkan font angka (monospace/tabular-nums) dari font teks biasa supaya angka tidak "loncat-loncat" saat update realtime.
- Untuk landing/marketing (Coruna Hills, Kurnia Vista, undangan digital): boleh lebih ekspresif — foto/ilustrasi properti sebagai hero, bukan ilustrasi generik abstrak.
- Untuk admin/internal tools (CI3 legacy atau dashboard internal): prioritaskan densitas informasi dan kejelasan, bukan estetika maksimal — tapi tetap hindari tampilan Bootstrap-default polos.

## 5. Self-check sebelum submit

Sebelum kasih hasil, tanya ke diri sendiri:

- Kalau prompt ini dikasih ke AI lain tanpa konteks bisnis, apakah hasilnya akan mirip? Kalau iya → revisi bagian yang generik.
- Apakah ada elemen yang tidak berfungsi, cuma dekorasi kosong (numbered marker padahal bukan urutan, icon yang tidak relevan)? Hapus.
- Apakah warna aksen dipakai secukupnya (bukan di mana-mana)?
- Apakah copy-nya bisa dipakai untuk produk lain tanpa ganti kata? Kalau bisa → terlalu generik, tulis ulang lebih spesifik.
- Apakah sudah responsive dan focus state (keyboard) terlihat jelas?
