package com.example.comment_publisher.repository;

import com.example.comment_publisher.model.Comment;
import org.springframework.data.cassandra.repository.CassandraRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CommentRepository extends CassandraRepository<Comment, UUID> {
}
