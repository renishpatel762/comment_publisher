package com.example.comment_publisher.controller;

import com.example.comment_publisher.model.Comment;
import com.example.comment_publisher.repository.CommentRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/videos")
@RequiredArgsConstructor
public class CommentController {

    private final CommentRepository commentRepository;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String CHANNEL = "live-comments";

    @PostMapping("/{videoId}/comments")
    public ResponseEntity<?> publishComment(
            @PathVariable String videoId,
            @RequestBody Map<String, String> body) {
        
        String commentText = body.get("comment");
        String author = body.getOrDefault("author", "Anonymous");

        if (commentText == null || commentText.trim().isEmpty()) {
            log.warn("Comment creation failed - missing comment for video {}", videoId);
            return ResponseEntity.badRequest().body(Map.of("error", "Comment text is required"));
        }

        try {
            // 1. Create Comment data
            Comment comment = Comment.builder()
                    .id(UUID.randomUUID())
                    .author(author)
                    .videoId(videoId)
                    .comment(commentText)
                    .likes(0)
                    .createdAt(Instant.now())
                    .build();

            // 2. Store in Cassandra
            commentRepository.save(comment);
            log.info("Comment saved to Cassandra: {}", comment.getId());

            // 3. Publish to Redis
            String message = objectMapper.writeValueAsString(comment);
            redisTemplate.convertAndSend(CHANNEL, message);
            log.info("Comment published to Redis channel {}: {}", CHANNEL, comment.getId());

            return ResponseEntity.ok(Map.of(
                    "status", "Comment published",
                    "commentId", comment.getId().toString(),
                    "message", message
            ));

        } catch (JsonProcessingException e) {
            log.error("Error serializing comment", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error"));
        } catch (Exception e) {
            log.error("Error publishing comment for video {}", videoId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Internal Server Error"));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        return ResponseEntity.ok(Map.of(
                "status", "healthy",
                "service", "comment_publisher",
                "timestamp", Instant.now().toString()
        ));
    }
}
