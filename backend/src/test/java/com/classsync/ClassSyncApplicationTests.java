package com.classsync;
import org.junit.jupiter.api.Test; import org.springframework.boot.test.context.SpringBootTest;
@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:classsync-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE","app.uploads-dir=./target/test-uploads","app.bootstrap.password=TestPassword123!"}) class ClassSyncApplicationTests {@Test void contextLoads(){} }
