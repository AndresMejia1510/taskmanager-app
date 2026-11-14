package com.taskmanager.backend.repository;

import com.taskmanager.backend.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {
    
    // Buscar tareas por usuario
    List<Task> findByUserId(Long userId);

    Optional<Task> findByIdAndUserId(Long id, Long userId);

    // Búsqueda por título o descripción y filtrado opcional por estado/prioridad
    @Query("SELECT t FROM Task t WHERE t.user.id = :userId AND " +
           "(:searchTerm IS NULL OR LOWER(t.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) OR LOWER(t.description) LIKE LOWER(CONCAT('%', :searchTerm, '%'))) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:priority IS NULL OR t.priority = :priority)")
    List<Task> searchAndFilterTasks(
        @Param("userId") Long userId,
        @Param("searchTerm") String searchTerm,
        @Param("status") Task.Status status,
        @Param("priority") Task.Priority priority
    );
}