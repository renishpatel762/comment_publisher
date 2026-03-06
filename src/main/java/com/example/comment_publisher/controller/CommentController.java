package com.example.comment_publisher.controller;

import com.example.comment_publisher.model.Comment;
import com.example.comment_publisher.repository.CommentRepository;
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

    private static final String CHANNEL = "live-comments";

    @PostMapping("/{videoId}/comments")
    public ResponseEntity<?> publishComment(
            @PathVariable String videoId,
            @RequestBody Map<String, Object> body) {

        String commentText = body.get("comment") != null ? body.get("comment").toString() : null;
        Object authorObj = body.get("author");
        String author = "Anonymous";

        if (authorObj instanceof String) {
            author = (String) authorObj;
        } else if (authorObj instanceof Map) {
            Map<?, ?> authorMap = (Map<?, ?>) authorObj;
            Object name = authorMap.get("name");
            if (name == null) name = authorMap.get("username");
            if (name == null) name = authorMap.get("displayName");
            if (name != null) author = name.toString();
        }

        if (commentText == null || commentText.trim().isEmpty()) {
            log.warn("Comment creation failed - missing comment for video {}", videoId);
            return ResponseEntity.badRequest().body(Map.of("error", "Comment text is required"));
        }

        try {

            // 1️⃣ Create Comment
            Comment comment = Comment.builder()
                    .id(UUID.randomUUID())
                    .author(author)
                    .videoId(videoId)
                    .comment(commentText)
                    .createdAt(Instant.now())
                    .build();

            // 2️⃣ Save to Cassandra
            commentRepository.save(comment);
            log.info("Comment saved to Cassandra: {}", comment.getId());

            // 3️⃣ Create JSON manually
            String message = String.format(
                    "{\"id\":\"%s\",\"videoId\":\"%s\",\"author\":\"%s\",\"comment\":\"%s\",\"createdAt\":\"%s\"}",
                    comment.getId(),
                    comment.getVideoId(),
                    comment.getAuthor(),
                    comment.getComment(),
                    comment.getCreatedAt()
            );

            // 4️⃣ Publish to Redis
            redisTemplate.convertAndSend(CHANNEL, message);
            log.info("Comment published to Redis channel {}: {}", CHANNEL, comment.getId());

            return ResponseEntity.ok(Map.of(
                    "status", "Comment published",
                    "commentId", comment.getId().toString()
            ));

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