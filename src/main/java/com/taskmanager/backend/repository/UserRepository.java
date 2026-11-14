package com.taskmanager.backend.repository;

import com.taskmanager.backend.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Método correcto basado en el campo 'username'
    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    // Si tienes este, bórralo o cámbialo ya que 'email' no existe en User:
    // boolean existsByEmail(String email); 
    
    // Si necesitas verificar si existe por usuario:
    boolean existsByUsername(String username);

    boolean existsByEmail(String email);
}