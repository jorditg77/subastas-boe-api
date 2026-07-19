# Imagen base oficial de Apify para Node.js.
FROM apify/actor-node:20

# Instala solo las dependencias del actor (su propio package.json), no las del
# servidor. El contexto de build es la raíz del repo.
COPY apify/package.json ./
RUN npm --quiet install --omit=dev --no-package-lock \
  && echo "Installed dependencies:" \
  && (npm ls --omit=dev --all || true)

# Copia los scrapers reutilizados del repo y el punto de entrada del actor.
# Quedan como ./src y ./main.js dentro del contenedor, por eso main.js importa
# con rutas './src/...'.
COPY src ./src
COPY apify/main.js ./main.js

CMD ["node", "main.js"]
