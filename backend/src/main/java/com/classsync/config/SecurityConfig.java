package com.classsync.config;

import com.classsync.repository.UserRepository;
import com.classsync.service.ClassroomSharing;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.*;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.authorization.AuthorityAuthorizationManager;
import org.springframework.security.web.access.intercept.RequestAuthorizationContext;
import org.springframework.security.core.userdetails.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.web.cors.*;
import java.util.List;

@Configuration @EnableMethodSecurity
public class SecurityConfig {
 @Bean PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
 @Bean UserDetailsService users(UserRepository repo){ return email -> repo.findByEmailIgnoreCase(email).map(u -> new org.springframework.security.core.userdetails.User(u.getEmail(),u.getPasswordHash(),u.getApprovalStatus()==com.classsync.entity.User.ApprovalStatus.APPROVED,true,true,true,List.of(new SimpleGrantedAuthority("ROLE_"+u.getRole().name())))).orElseThrow(() -> new UsernameNotFoundException("Invalid credentials")); }
 @Bean AuthenticationManager authenticationManager(AuthenticationConfiguration c) throws Exception{return c.getAuthenticationManager();}
 @Bean CorsConfigurationSource cors(@Value("${app.frontend-url}") String frontend){ var c=new CorsConfiguration(); c.setAllowedOrigins(List.of(frontend)); c.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS")); c.setAllowedHeaders(List.of("Content-Type","X-XSRF-TOKEN",ClassroomSharing.HEADER)); c.setAllowCredentials(true); var source=new UrlBasedCorsConfigurationSource(); source.registerCorsConfiguration("/**",c); return source; }
 @Bean SecurityFilterChain security(HttpSecurity http, ClassroomSharing sharing) throws Exception {
   var csrf=CookieCsrfTokenRepository.withHttpOnlyFalse(); csrf.setCookiePath("/");
   var csrfHandler=new CsrfTokenRequestAttributeHandler();
   csrfHandler.setCsrfRequestAttributeName("_csrf");
   var crOnly=AuthorityAuthorizationManager.<RequestAuthorizationContext>hasRole("CR");
   return http.cors(c->{}).requestCache(cache->cache.disable())
     .csrf(c->c.csrfTokenRepository(csrf).csrfTokenRequestHandler(csrfHandler)).authorizeHttpRequests(a->a
     .requestMatchers(HttpMethod.GET,"/api/auth/csrf").permitAll()
     .requestMatchers(HttpMethod.POST,"/api/auth/login").permitAll()
     .requestMatchers("/error").permitAll()
     .requestMatchers(HttpMethod.GET,"/api/announcements","/api/events","/api/events/upcoming","/api/events/{id}/ics",
         "/api/subjects","/api/resources","/api/resources/{id}/download","/api/resource-folders","/api/classroom")
     .access((authentication, context)->{
       String token=context.getRequest().getHeader(ClassroomSharing.HEADER);
       return token==null ? crOnly.check(authentication,context) : new AuthorizationDecision(sharing.isValid(token));
     })
     .requestMatchers("/api/**").hasRole("CR").anyRequest().permitAll())
     .exceptionHandling(e->e.authenticationEntryPoint((req,res,x)->res.sendError(HttpStatus.UNAUTHORIZED.value())).accessDeniedHandler((req,res,x)->res.sendError(HttpStatus.FORBIDDEN.value())))
     .logout(l->l.disable()).build();
 }
}
