# Desplegar la versión web en un servidor

Build y arranque con Docker:

```bash
docker build -f deploy/Dockerfile -t notas-web .
docker run -d --name notas-web -p 8080:80 --restart unless-stopped notas-web
```

Después pon un proxy HTTPS delante (nginx o Caddy) con tu subdominio, por ejemplo `notas.tudominio.com` → `localhost:8080`.

Limitación: los apuntes se guardan en el navegador de cada dispositivo. No se sincronizan entre el móvil y el ordenador.
