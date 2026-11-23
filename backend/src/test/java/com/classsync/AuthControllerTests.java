package com.classsync;

import com.classsync.entity.User;
import com.classsync.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:auth-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE","app.uploads-dir=./target/test-uploads","app.bootstrap.email=bootstrap@test.local","app.bootstrap.password=TestPassword123!"})
@AutoConfigureMockMvc
class AuthControllerTests {
 @Autowired MockMvc mvc;
 @Autowired UserRepository users;
 @Autowired PasswordEncoder encoder;

 @Test void crCanLoginWithCsrf() throws Exception {
   mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"bootstrap@test.local\",\"password\":\"TestPassword123!\"}"))
     .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("CR"));
 }

 @Test void legacyStudentAccountCannotLogin() throws Exception {
   var user=new User();user.setName("Student");user.setEmail("student@test.local");user.setPasswordHash(encoder.encode("Student123!"));user.setRole(User.Role.STUDENT);user.setApprovalStatus(User.ApprovalStatus.APPROVED);users.save(user);
   mvc.perform(post("/api/auth/login").with(csrf()).contentType("application/json").content("{\"email\":\"student@test.local\",\"password\":\"Student123!\"}"))
     .andExpect(status().isUnauthorized());
 }
}
