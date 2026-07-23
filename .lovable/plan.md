# Rencana Pembangunan Fitur Equora

Semua dipilih. Karena scope-nya sangat besar, saya bangun bertahap dari yang paling siap-produksi ke yang paling eksperimental. Setiap tahap **fungsional penuh** sebelum lanjut ke tahap berikutnya — bukan tempelan.

---

## Tahap 1 — AI Chatbot (paling cepat matang)

**Untuk:** Siswa & Guru. Server function `chat.functions.ts` memanggil Lovable AI Gateway (`google/gemini-3.6-flash`) via streaming.

Fitur:
- Chat multi-turn dengan histori disimpan di tabel `chat_conversations` + `chat_messages`.
- Preset prompt: "Jelaskan materi", "Buat ringkasan", "Beri 5 contoh soal", "Buat latihan", "Terjemahkan BISINDO teks".
- Rendering markdown, tombol Baca Suara per pesan (TTS), input dikte (STT sudah ada).
- Guru dapat titipkan konteks materi kelas → chatbot menjawab berbasis materi tsb.

**Fallback error 429/402** ditampilkan sebagai toast.

---

## Tahap 2 — Ujian + Gamification

**Skema DB baru:** `exams`, `exam_questions` (tipe: mc, essay, dragdrop, matching), `exam_attempts`, `exam_answers`, `xp_events`, `badges`, `user_badges`, `leaderboard_view`.

Fitur Ujian:
- Guru membuat ujian: timer (menit), acak soal, jumlah soal random dari bank.
- Siswa mengerjakan: auto-save setiap 10 detik ke `exam_attempts.draft_json`, timer countdown, submit otomatis saat habis.
- Auto-grading untuk MC/matching/dragdrop; essay masuk antrian koreksi guru.

Gamification:
- XP diberi otomatis (kuis selesai, ujian lulus, streak login, materi tuntas) via trigger DB.
- Level = floor(sqrt(xp/100)). Badge otomatis (Pemula, Rajin, Juara Kelas, Master).
- Leaderboard per kelas & per sekolah (view SQL).
- Game edukasi (Matching Card, Word Search, Memory Game, Tebak Gambar, Puzzle drag-drop) — masing-masing komponen React murni yang menyumbang XP ke `xp_events`.

---

## Tahap 3 — Meeting Online (WebRTC)

**Tanpa aplikasi pihak ketiga**, semua peer-to-peer via WebRTC + Supabase Realtime sebagai signaling.

- Tabel `meetings` (host, class_id, kode gabung, mulai, selesai) + kanal Realtime per meeting.
- Fitur: Video/Voice call (getUserMedia), Chat (Realtime broadcast), Screen Share (`getDisplayMedia`), Raise Hand (state broadcast), Live Caption (Web Speech API di klien host + broadcast teks), Recording lokal (MediaRecorder → blob download), Whiteboard (canvas HTML5 + broadcast stroke event).

**Batas jujur:** untuk peserta > 4-8 orang WebRTC mesh bisa berat — akan ditampilkan peringatan. TURN server tidak dikonfigurasi, jadi bisa gagal di jaringan NAT ketat; ini akan disebutkan di UI.

---

## Tahap 4 — AI Camera Vision (BISINDO)

**Ini fitur paling ambisius; saya jujur soal batasannya.**

Teknologi: **MediaPipe Hands** (`@mediapipe/tasks-vision`) di browser — mendeteksi 21 landmark tangan real-time via webcam. Semua di klien, tidak ada model dikirim ke server.

Yang bisa dibangun realistis dalam scope ini:
- Deteksi tangan real-time + tampilkan landmark overlay.
- **Klasifikasi gestur BISINDO dasar (A–Z alfabet jari + ~10 kata umum: halo, terima kasih, ya, tidak, tolong, guru, siswa, belajar, sekolah, selesai)** menggunakan aturan geometris landmark (rule-based classifier) — bukan model deep learning kustom karena tidak ada dataset BISINDO terlisensi yang bisa saya latih dalam sesi ini.
- Indikator akurasi (confidence 0–100%) dari kecocokan aturan.
- Notifikasi "Gestur tidak terbaca jelas" jika confidence < 50%.
- Buffer huruf → kata → kirim ke Text-to-Speech (sudah ada).
- Integrasi di Meeting (kirim teks ke chat), AI Chatbot (isi input), dan halaman "Terjemahan BISINDO" mandiri.

**Batasan yang harus diketahui:**
- Rule-based hanya akurat untuk gestur statis; gerakan dinamis (kata dengan gerakan) tidak didukung penuh.
- Kosakata terbatas (~36 gestur). Untuk vocabulary luas dibutuhkan model ML terlatih pada dataset BISINDO — proyek riset tersendiri.

---

## Urutan & konfirmasi

Saya usulkan **mulai Tahap 1 dulu** sekarang. Setelah selesai & Anda uji, lanjut Tahap 2, dst. Ini agar setiap tahap benar-benar bisa dipakai, bukan setengah jadi di semua tempat.

Balas **"lanjut"** untuk mulai Tahap 1 (AI Chatbot), atau sebutkan tahap mana yang ingin didahulukan.