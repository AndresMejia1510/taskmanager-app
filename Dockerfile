# Etapa de compilación
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# Copiar archivos de configuración y dependencias
COPY .mvn/ .mvn
COPY mvnw pom.xml ./

# Descargar dependencias (aprovechando la caché de Docker)
RUN ./mvnw dependency:go-offline

# Copiar el código fuente y compilar
COPY src/ ./src
RUN ./mvnw clean package -DskipTests

# Etapa de ejecución
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]