# Mapify

**Interaktywna aplikacja webowa do zapisywania i odkrywania miejsc połączonych z muzyką.** Każde miejsce ma przypisany utwór z Spotify, kategorię wspomnień oraz możliwość dodawania komentarzy i polubień przez społeczność.
![Mapify](screenshot.png)
**Live Demo:** https://lukaszskotniczny.github.io/Mapify/

## Funkcjonalności

### Interaktywna Mapa
- Leaflet.js z kolorowymi markerami według kategorii
- Tryb nocny i jasny z automatycznym przełączaniem warstw mapy
- Animacje przy dodawaniu nowych miejsc
- Pełna responsywność - działa na komputerach, tabletach i smartfonach
- Dodawanie miejsc przez podwójne kliknięcie

### Integracja Spotify
- Wyszukiwarka utworów z API Spotify
- Podgląd okładek albumów
- Bezpośrednie linki do utworów
- Preview audio

### Wyszukiwanie i Filtrowanie
- Wyszukiwarka miejsc po tytule, artyście lub opisie
- Filtry kategorii z dynamicznymi licznikami
- Funkcja losowania miejsc z animacją
- Kategorie: Bieganie, Randka, Nostalgiczne, Trening, Relaks, Impreza, Inne

### Social Features
- System polubień współdzielony między użytkownikami
- Komentarze z datą i imieniem autora
- Realtime synchronizacja przez Supabase
- Unikalne ID użytkownika przechowywane w localStorage

### Statystyki
- Liczba wszystkich miejsc na mapie
- Top 5 najczęściej używanych artystów
- Najpopularniejsza kategoria wspomnień
- Dynamiczne liczniki przy filtrach

### UI/UX
- Animowany ekran powitalny
- System powiadomień toast
- Płynne animacje i przejścia
- Intuicyjny interfejs użytkownika

## Stack Technologiczny

### Backend
- Python 3.11+
- Flask - framework webowy
- SQLAlchemy - ORM
- SQLite - lokalna baza danych
- Spotipy - klient Spotify API

### Frontend
- HTML5/CSS3
- JavaScript (ES6+)
- Leaflet.js - biblioteka map
- Spotify Web API

### Cloud
- Supabase - PostgreSQL database dla funkcji społecznościowych
- GitHub Pages - hosting frontendu

## Instalacja i Uruchomienie

### Wymagania
- Python 3.8 lub nowszy
- Konto Spotify Developer

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend uruchomi się na `http://localhost:5000`

### Frontend

Otwórz plik `index.html` w przeglądarce lub użyj Live Server w VS Code.

**Funkcje społecznościowe działają z Supabase bez potrzeby uruchamiania backendu lokalnie.**

## Kategorie Miejsc

- **Bieganie** - miejsca związane z aktywnością fizyczną
- **Randka** - romantyczne miejsca
- **Nostalgiczne** - miejsca związane z wspomnieniami
- **Trening** - miejsca treningowe i siłownie
- **Relaks** - miejsca do odpoczynku
- **Impreza** - miejsca imprezowe
- **Inne** - pozostałe kategorie

## Responsywność

Aplikacja jest w pełni responsywna i działa na:
- Desktop (1920px+)
- Laptop (1366px+)
- Tablet (768px+)
- Smartfon (320px+)

## Wersje Aplikacji

### Online (GitHub Pages)
- Demo z przykładowymi miejscami
- Pełna funkcjonalność UI
- Aktywne social features (polubienia, komentarze)
- Brak możliwości dodawania nowych miejsc

### Lokalna (z backendem)
- Pełna funkcjonalność
- Dodawanie miejsc przez Spotify API
- Edycja i usuwanie miejsc
- Wszystkie funkcje social
- 
## Autor

**Łukasz Skotniczny**  

GitHub: [@lukaszskotniczny](https://github.com/lukaszskotniczny)

## Licencja

MIT License

**Live Demo:** https://lukaszskotniczny.github.io/Mapify/  
**Repozytorium:** https://github.com/lukaszskotniczny/mapify

