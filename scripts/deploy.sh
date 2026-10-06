#!/usr/bin/env bash
# ==============================================================================
# Quantum Visualisation - Build & Deployment Script
# Supports:
#   - Local verification & build
#   - Preview server execution
#   - GitHub Pages git branch deployment
#   - Custom target directory / web server copy
# ==============================================================================

set -euo pipefail

# ANSI Color codes
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

# Project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

print_header() {
  echo -e "\n${BOLD}${CYAN}================================================================${RESET}"
  echo -e "${BOLD}${CYAN}  Quantum Visualisation Deployment Tool                         ${RESET}"
  echo -e "${BOLD}${CYAN}================================================================${RESET}\n"
}

usage() {
  echo -e "${BOLD}Használat / Usage:${RESET}"
  echo "  $0 [options]"
  echo ""
  echo -e "${BOLD}Opciók / Options:${RESET}"
  echo "  -b, --build-only      Csak éles build készítése (npm ci + npm run build)"
  echo "  -p, --preview         Build készítése és helyi preview szerver indítása"
  echo "  -g, --gh-pages        Deploy készítése a gh-pages git ágra"
  echo "  -d, --dest <path>     A dist könyvtár másolása a megadott célkönyvtárba"
  echo "  -h, --help            Segítség megjelenítése"
  echo ""
  echo -e "${BOLD}Példák / Examples:${RESET}"
  echo "  $0 --build-only"
  echo "  $0 --preview"
  echo "  $0 --dest /var/www/html/visualisation"
  echo "  $0 --gh-pages"
  exit 0
}

check_prerequisites() {
  echo -e "${CYAN}[1/4] Előfeltételek ellenőrzése...${RESET}"
  if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}Hiba: A Node.js nincs telepítve! Szükséges verzió: >= 18.0.0${RESET}" >&2
    exit 1
  fi

  if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}Hiba: Az npm nincs telepítve!${RESET}" >&2
    exit 1
  fi

  local node_ver
  node_ver="$(node -v)"
  echo -e "  - Node.js verzió: ${GREEN}${node_ver}${RESET}"
  echo -e "  - NPM verzió:     ${GREEN}$(npm -v)${RESET}"
}

run_build() {
  echo -e "\n${CYAN}[2/4] Függőségek és éles build készítése...${RESET}"
  if [ ! -d "node_modules" ]; then
    echo "  -> Függőségek letöltése (npm install)..."
    npm install
  fi

  echo "  -> Teljes disztribúció építése (Docs + 3D App)..."
  npm run build

  if [ ! -f "site/index.html" ] || [ ! -f "site/app/index.html" ]; then
    echo -e "${RED}Hiba: A build sikertelen, site/index.html vagy site/app/index.html nem jött létre!${RESET}" >&2
    exit 1
  fi

  echo -e "  -> ${GREEN}Sikeres build!${RESET} Kimeneti méret:"
  du -sh site/
}

deploy_local_dest() {
  local target_dir="$1"
  echo -e "\n${CYAN}[3/4] Másolás a célkönyvtárba: ${BOLD}${target_dir}${RESET}"
  mkdir -p "${target_dir}"
  cp -r site/* "${target_dir}/"
  echo -e "${GREEN}A fájlok sikeresen átmásolva ide: ${target_dir}${RESET}"
}

deploy_gh_pages() {
  echo -e "\n${CYAN}[3/4] GitHub Pages (gh-pages ág) telepítése...${RESET}"
  if ! command -v git >/dev/null 2>&1; then
    echo -e "${RED}Hiba: A git nincs telepítve!${RESET}" >&2
    exit 1
  fi

  local current_branch
  current_branch="$(git rev-parse --abbrev-ref HEAD)"

  echo "  - Jelenlegi ág: ${current_branch}"
  echo "  - Ideiglenes munkakönyvtár létrehozása..."

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  cp -r site/* "${tmp_dir}/"

  local repo_url
  repo_url="$(git config --get remote.origin.url || true)"
  if [ -z "${repo_url}" ]; then
    echo -e "${YELLOW}Figyelem: Nincs beállítva 'origin' távoli git tároló. Csak helyi gh-pages ág készítése.${RESET}"
  fi

  # Git subtree vagy független worktree push a gh-pages ágra
  echo "  - Frissítés a gh-pages ágon..."
  git checkout -B gh-pages
  rm -rf ./*
  cp -r "${tmp_dir}"/* ./
  git add -A
  git commit -m "Deploy to GitHub Pages: $(date -u +"%Y-%m-%d %H:%M:%S UTC")" || echo "Nincs új változás a commitban."

  if [ -n "${repo_url}" ]; then
    echo "  - Push küldése origin/gh-pages-re..."
    git push -u origin gh-pages --force || echo -e "${YELLOW}Figyelem: A push sikertelen (lehet hálózati vagy jogosultsági ok).${RESET}"
  fi

  echo "  - Visszaváltás az eredeti ágra: ${current_branch}..."
  git checkout "${current_branch}"
  rm -rf "${tmp_dir}"

  echo -e "${GREEN}GitHub Pages ág frissítése kész!${RESET}"
}

run_preview() {
  echo -e "\n${CYAN}[4/4] Helyi preview szerver indítása...${RESET}"
  echo -e "${YELLOW}Nyisd meg a böngészőben a kiírt címet (leállítás: Ctrl+C)${RESET}"
  npm run preview
}

main() {
  print_header

  local mode="build"
  local dest_dir=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -b|--build-only)
        mode="build"
        shift
        ;;
      -p|--preview)
        mode="preview"
        shift
        ;;
      -g|--gh-pages)
        mode="gh-pages"
        shift
        ;;
      -d|--dest)
        mode="dest"
        dest_dir="$2"
        shift 2
        ;;
      -h|--help)
        usage
        ;;
      *)
        echo -e "${RED}Ismeretlen opció: $1${RESET}" >&2
        usage
        ;;
    esac
  done

  check_prerequisites
  run_build

  case "${mode}" in
    build)
      echo -e "\n${GREEN}${BOLD}✓ A build sikeresen befejeződött a 'dist/' mappában.${RESET}"
      ;;
    dest)
      deploy_local_dest "${dest_dir}"
      echo -e "\n${GREEN}${BOLD}✓ Célkönyvtárba történő telepítés kész!${RESET}"
      ;;
    gh-pages)
      deploy_gh_pages
      echo -e "\n${GREEN}${BOLD}✓ GitHub Pages telepítés kész!${RESET}"
      ;;
    preview)
      run_preview
      ;;
  esac
}

main "$@"
