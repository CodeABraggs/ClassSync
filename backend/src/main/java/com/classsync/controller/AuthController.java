package com.classsync.controller;
import com.classsync.repository.UserRepository; import jakarta.servlet.http.*; import jakarta.validation.Valid; import jakarta.validation.constraints.*; import org.springframework.security.authentication.*; import org.springframework.security.core.Authentication; import org.springframework.security.core.context.*; import org.springframework.security.web.context.HttpSessionSecurityContextRepository; import org.springframework.security.web.csrf.CsrfToken; import org.springframework.web.bind.annotation.*; import java.util.Map;
@RestController @RequestMapping("/api/auth") public class AuthController {
 private final UserRepository users; private final AuthenticationManager auth;
 public AuthController(UserRepository users, AuthenticationManager auth){this.users=users;this.auth=auth;}
 public record Login(@NotBlank @Email String email,@NotBlank String password){} public record Me(Long id,String name,String email,String role){}
 @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token){return Map.of("token",token.getToken());}
 @PostMapping("/login") public Me login(@Valid @RequestBody Login r,HttpServletRequest req){Authentication a=auth.authenticate(new UsernamePasswordAuthenticationToken(r.email().trim().toLowerCase(),r.password()));if(a.getAuthorities().stream().noneMatch(role->role.getAuthority().equals("ROLE_CR")))throw new BadCredentialsException("Invalid credentials");var context=SecurityContextHolder.createEmptyContext();context.setAuthentication(a);SecurityContextHolder.setContext(context);req.getSession(true).setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,context);return me(a);}
 @PostMapping("/logout") public Map<String,String> logout(HttpServletRequest req){var s=req.getSession(false);if(s!=null)s.invalidate();SecurityContextHolder.clearContext();return Map.of("message","Logged out");}
 @GetMapping("/me") public Me me(Authentication a){var u=users.findByEmailIgnoreCase(a.getName()).orElseThrow();return new Me(u.getId(),u.getName(),u.getEmail(),u.getRole().name());}
}
