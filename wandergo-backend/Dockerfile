# ============================================================
# WANDERGO 后端镜像（多阶段构建）
#   阶段1：Maven 打可执行 jar
#   阶段2：JRE 17 运行（体积小、启动快）
# 构建：docker build -t wandergo-backend .
# 运行：由 docker-compose.yml 统一编排（含 MySQL + Nginx 前端）
# ============================================================
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /build
# 先拷 pom 拉依赖，利用 Docker 层缓存；改代码不必重新下载依赖
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /build/target/*.jar app.jar
# 时区与中文日志
ENV TZ=Asia/Shanghai \
    JAVA_OPTS="-Xms256m -Xmx512m"
EXPOSE 8080
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
