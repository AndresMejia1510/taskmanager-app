package com.taskmanager.backend.controller;

import com.taskmanager.backend.config.JwtUtil;
import com.taskmanager.backend.dto.AuthRequest;
import com.taskmanager.backend.dto.AuthResponse;
import com.taskmanager.backend.dto.RegisterRequest;
import com.taskmanager.backend.dto.UserResponse;
import com.taskmanager.backend.model.User;
import com.taskmanager.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody AuthRequest request) {
        return userRepository.findByUsername(request.username())
                .filter(user -> passwordEncoder.matches(request.password(), user.getPassword()))
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(
                        new AuthResponse(jwtUtil.generateToken(user.getUsername()))))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales inválidas"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        if (userRepository.existsByUsername(request.username())) {
            return ResponseEntity.badRequest().body("El nombre de usuario ya está en uso");
        }
        if (userRepository.existsByEmail(request.email())) {
            return ResponseEntity.badRequest().body("El correo electrónico ya está en uso");
        }

        User user = new User(
                request.username(),
                request.email(),
                passwordEncoder.encode(request.password()));
        User savedUser = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new UserResponse(savedUser.getId(), savedUser.getUsername()));
    }
}