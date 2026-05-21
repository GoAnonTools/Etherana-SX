# Update Etherana SX to the latest version

To update Etherana SX to the latest version, follow these steps:

## For Docker users (Using pre-built images)

Simply pull the latest image and restart your container:

```bash
docker pull itzcrazykns1337/Etherana SX:latest
docker stop Etherana SX
docker rm Etherana SX
docker run -d -p 3000:3000 -v Etherana SX-data:/home/Etherana SX/data --name Etherana SX itzcrazykns1337/Etherana SX:latest
```

For slim version:

```bash
docker pull itzcrazykns1337/Etherana SX:slim-latest
docker stop Etherana SX
docker rm Etherana SX
docker run -d -p 3000:3000 -e SEARXNG_API_URL=http://your-searxng-url:8080 -v Etherana SX-data:/home/Etherana SX/data --name Etherana SX itzcrazykns1337/Etherana SX:slim-latest
```

Once updated, go to http://localhost:3000 and verify the latest changes. Your settings are preserved automatically.

## For Docker users (Building from source)

1. Navigate to your Etherana SX directory and pull the latest changes:

   ```bash
   cd Etherana SX
   git pull origin master
   ```

2. Rebuild the Docker image:

   ```bash
   docker build -t Etherana SX .
   ```

3. Stop and remove the old container, then start the new one:

   ```bash
   docker stop Etherana SX
   docker rm Etherana SX
   docker run -p 3000:3000 -p 8080:8080 --name Etherana SX Etherana SX
   ```

4. Once the command completes, go to http://localhost:3000 and verify the latest changes.

## For non-Docker users

1. Navigate to your Etherana SX directory and pull the latest changes:

   ```bash
   cd Etherana SX
   git pull origin master
   ```

2. Install any new dependencies:

   ```bash
   npm i
   ```

3. Rebuild the application:

   ```bash
   npm run build
   ```

4. Restart the application:

   ```bash
   npm run start
   ```

5. Go to http://localhost:3000 and verify the latest changes. Your settings are preserved automatically.

---
