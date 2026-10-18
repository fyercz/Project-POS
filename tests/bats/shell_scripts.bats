#!/usr/bin/env bats
#
# Test untuk run.sh, install.sh, update.sh. Jalankan dengan: bats tests/bats/
#
# Skenario di sini meniru persis pengujian manual yang pernah dilakukan dan terbukti
# menemukan/mengonfirmasi perbaikan bug nyata:
# - run.sh harus berhenti (bukan lanjut ke npm run dev) kalau auto-install gagal.
# - update.sh tidak boleh menghapus file backup yang tidak di-track git.
# - update.sh harus benar-benar mengganti kode ke versi upstream (uncommitted edit hilang).
# - update.sh aman dijalankan sambil menimpa dirinya sendiri (self-overwrite).

setup() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
  TEST_TMP="$(mktemp -d)"
  cd "$TEST_TMP"
}

teardown() {
  cd /
  rm -rf "$TEST_TMP"
}

# --- run.sh ------------------------------------------------------------------

@test "run.sh berhenti (tidak lanjut start server) kalau auto-install gagal" {
  mkdir -p sandbox/fakebin
  cp "$REPO_ROOT/run.sh" sandbox/
  cp "$REPO_ROOT/install.sh" sandbox/
  cp "$REPO_ROOT/.env.example" sandbox/
  cd sandbox
  chmod +x run.sh install.sh

  # npm palsu yang SELALU gagal di "npm install", supaya kita bisa memastikan
  # run.sh tidak diam-diam lanjut ke "npm run dev" setelah auto-install gagal.
  cat > fakebin/npm <<'EOF'
#!/bin/bash
echo "[fake npm] $@"
if [ "$1" = "install" ]; then exit 1; fi
if [ "$1" = "run" ] && [ "$2" = "dev" ]; then echo "SEHARUSNYA TIDAK PERNAH SAMPAI SINI"; exit 0; fi
exit 0
EOF
  chmod +x fakebin/npm

  run env PATH="$PWD/fakebin:$PATH" timeout 10 ./run.sh
  [ "$status" -ne 0 ]
  [[ "$output" != *"SEHARUSNYA TIDAK PERNAH SAMPAI SINI"* ]]
}

# --- update.sh -----------------------------------------------------------------

setup_fake_remote_and_install() {
  mkdir -p remote install
  (
    cd remote
    git init -q
    git config user.email a@b
    git config user.name t
    echo '{"name":"fake","version":"2.0.0","scripts":{"build":"echo BUILD_OK"}}' > package.json
    echo "console.log('versi BARU dari GitHub')" > app.js
    cp "$REPO_ROOT/update.sh" .
    git add -A
    git commit -qm "v2"
    git branch -M main
  )
  (
    cd install
    git init -q
    git config user.email a@b
    git config user.name t
    echo '{"name":"fake","version":"1.0.0","scripts":{"build":"echo BUILD_OK"}}' > package.json
    echo "console.log('versi LAMA')" > app.js
    cp "$REPO_ROOT/update.sh" .
    git add -A
    git commit -qm "v1"
  )
}

@test "update.sh menarik kode terbaru dan membuang edit lokal yang belum di-commit" {
  setup_fake_remote_and_install
  cd install
  sed -i "s#https://github.com/fyercz/Project-POS.git#$PWD/../remote#" update.sh
  echo "// edit lokal yang belum di-commit, harus hilang setelah update" >> app.js

  run timeout 30 bash update.sh
  [ "$status" -eq 0 ]
  run cat app.js
  [[ "$output" == *"versi BARU dari GitHub"* ]]
  [[ "$output" != *"edit lokal"* ]]
  run grep version package.json
  [[ "$output" == *"2.0.0"* ]]
}

@test "update.sh TIDAK menghapus file backup yang tidak di-track git" {
  setup_fake_remote_and_install
  cd install
  sed -i "s#https://github.com/fyercz/Project-POS.git#$PWD/../remote#" update.sh
  echo "DATA BACKUP PENTING - JANGAN HILANG" > backup_pertashop_untracked.json

  run timeout 30 bash update.sh
  [ "$status" -eq 0 ]
  [ -f backup_pertashop_untracked.json ]
  run cat backup_pertashop_untracked.json
  [[ "$output" == *"JANGAN HILANG"* ]]
}

@test "update.sh aman dijalankan sambil file dirinya sendiri ditimpa git (self-overwrite)" {
  # Regresi untuk perilaku spesifik: script yang sedang berjalan terus membaca dari
  # inode LAMA sampai selesai, meski git reset --hard menulis isi baru ke path yang sama.
  mkdir -p remote
  cd remote
  git init -q; git config user.email a@b; git config user.name t
  cat > selftest.sh <<'EOF'
#!/usr/bin/env bash
echo "VERSI_BARU"
EOF
  git add -A; git commit -qm new; git branch -M main
  cd ..

  mkdir -p install
  cd install
  git init -q; git config user.email a@b; git config user.name t
  cat > selftest.sh <<EOF
#!/usr/bin/env bash
echo "VERSI_LAMA - mulai"
sleep 1
git fetch ../remote main --quiet
git reset --hard FETCH_HEAD --quiet
echo "VERSI_LAMA - setelah reset, tetap lanjut"
sleep 1
echo "VERSI_LAMA - selesai, masih hidup"
EOF
  chmod +x selftest.sh
  git add -A; git commit -qm old

  run bash selftest.sh
  [ "$status" -eq 0 ]
  [[ "$output" == *"VERSI_LAMA - mulai"* ]]
  [[ "$output" == *"VERSI_LAMA - setelah reset, tetap lanjut"* ]]
  [[ "$output" == *"VERSI_LAMA - selesai, masih hidup"* ]]
  run cat selftest.sh
  [[ "$output" == *"VERSI_BARU"* ]]
}
