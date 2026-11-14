package com.taskmanager.backend.controller;

import com.taskmanager.backend.dto.TaskRequest;
import com.taskmanager.backend.dto.TaskResponse;
import com.taskmanager.backend.dto.TaskStatusRequest;
import com.taskmanager.backend.dto.TaskUpdateRequest;
import com.taskmanager.backend.model.Task;
import com.taskmanager.backend.model.User;
import com.taskmanager.backend.repository.TaskRepository;
import com.taskmanager.backend.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskController(TaskRepository taskRepository, UserRepository userRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<TaskResponse> getAllTasks(Authentication authentication) {
        User user = findUser(authentication.getName());
        return taskRepository.findByUserId(user.getId()).stream()
                .map(TaskResponse::from)
                .toList();
    }

    @PostMapping
    public TaskResponse createTask(@Valid @RequestBody TaskRequest request, Authentication authentication) {
        Task task = new Task();
        task.setTitle(request.title().trim());
        task.setDescription(request.description());
        task.setDueDate(request.dueDate());
        task.setPriority(request.priority() == null ? Task.Priority.MEDIA : request.priority());
        task.setStatus(request.status() == null ? Task.Status.PENDIENTE : request.status());
        task.setUser(findUser(authentication.getName()));
        return TaskResponse.from(taskRepository.save(task));
    }

    @PutMapping("/{taskId}")
    public TaskResponse updateTask(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskUpdateRequest request,
            Authentication authentication) {
        User user = findUser(authentication.getName());
        Task task = findTask(taskId, user.getId());
        task.setTitle(request.title().trim());
        task.setDescription(request.description());
        task.setDueDate(request.dueDate());
        if (request.priority() != null) {
            task.setPriority(request.priority());
        }
        return TaskResponse.from(taskRepository.save(task));
    }

    @PatchMapping("/{taskId}/status")
    public TaskResponse updateStatus(
            @PathVariable Long taskId,
            @Valid @RequestBody TaskStatusRequest request,
            Authentication authentication) {
        User user = findUser(authentication.getName());
        Task task = findTask(taskId, user.getId());
        task.setStatus(request.status());
        return TaskResponse.from(taskRepository.save(task));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> deleteTask(@PathVariable Long taskId, Authentication authentication) {
        User user = findUser(authentication.getName());
        Task task = findTask(taskId, user.getId());
        taskRepository.delete(task);
        return ResponseEntity.noContent().build();
    }

    private Task findTask(Long taskId, Long userId) {
        return taskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private User findUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}