package com.classsync.config;
import com.classsync.entity.User; import com.classsync.repository.UserRepository; import org.springframework.beans.factory.annotation.Value; import org.springframework.boot.CommandLineRunner; import org.springframework.context.annotation.*; import org.springframework.security.crypto.password.PasswordEncoder;
@Configuration public class BootstrapConfig {
 @Bean
 CommandLineRunner bootstrap(UserRepository repo, PasswordEncoder encoder,
     @Value("${app.bootstrap.email}") String email, @Value("${app.bootstrap.password}") String password,
     @Value("${app.bootstrap.name}") String name) {
   return args -> {
     String address = email.strip().toLowerCase(java.util.Locale.ROOT);
     if (repo.findByEmailIgnoreCase(address).isPresent()) return;
     if (password.isBlank()) {
       throw new IllegalStateException("Set CR_PASSWORD in .env before creating the first CR account.");
     }
     var user = new User();
     user.setName(name);
     user.setEmail(address);
     user.setPasswordHash(encoder.encode(password));
     user.setRole(User.Role.CR);
     user.setApprovalStatus(User.ApprovalStatus.APPROVED);
     repo.save(user);
   };
 }
}
