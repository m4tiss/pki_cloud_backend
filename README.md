# Link do strony https://pki-cloud-backend-9vqe.onrender.com


# Link do repozytorium https://github.com/m4tiss/pki_cloud_backend


# Środowisko Uruchomieniowe:


# Node.js:
Kod jest napisany w języku JavaScript i działa w środowisku wykonawczym Node.js. Pozwala to na pisanie skryptów po stronie serwera w języku JavaScript.


# Express.js:
 Moduł express jest używany do tworzenia serwera internetowego oraz obsługi żądań i odpowiedzi HTTP.


# Struktura Projektu:


# Zależności:
* googleapis: Wykorzystywane do interakcji z różnymi interfejsami API Google.
* express: Framework do tworzenia aplikacji internetowych.
* axios: Klient HTTP do wykonywania żądań do zewnętrznych usług, takich jak API GitHuba.


# Konfiguracja:
* OAuth2Data: Plik konfiguracyjny zawierający dane uwierzytelniające OAuth2 dla Google.
* google_key.json: Plik JSON zawierający dane uwierzytelniające OAuth2 dla Google.
* GITHUB_CLIENT_ID i GITHUB_CLIENT_SECRET: Dane uwierzytelniające OAuth2 dla GitHuba.


# Endpointy:
* Główny Endpoint (/): Wyświetla linki do logowania przez Google i GitHub, jeśli użytkownik nie jest uwierzytelniony. Jeśli jest uwierzytelniony, wyświetla informacje o użytkowniku i link do wylogowania.

* Endpoint Logowania przez Google (/login): Rozpoczyna proces uwierzytelniania OAuth2 przez Google, przekierowując użytkownika na stronę uwierzytelniania Google'a.

* Endpoint Callback od Google (/auth/google/callback): Odbiera wywołanie zwrotne od Google po uwierzytelnianiu, wymienia kod na tokeny i oznacza użytkownika jako uwierzytelnionego.

* Endpoint Wylogowania z Google (/logout): Unieważnia dane uwierzytelniające OAuth2 dla Google i wylogowuje użytkownika.

* Endpoint Logowania przez GitHub (/loginGithub): Rozpoczyna proces uwierzytelniania OAuth2 przez GitHub, przekierowując użytkownika na stronę uwierzytelniania GitHuba.

* Endpoint Callback od GitHub (/github/callback): Odbiera wywołanie zwrotne od GitHuba po uwierzytelnianiu, wymienia kod na token dostępu, pobiera dane użytkownika z API GitHuba i je wyświetla.

* Endpoint Wylogowania z GitHub (/logoutGithub): Czyści token dostępu dla GitHuba i wylogowuje użytkownika.
