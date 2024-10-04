package com.teamopensmartglasses.convoscope;

import java.util.Objects;
import java.util.PriorityQueue;
import java.util.Queue;

public class TimestampedQueueForStudy {
    private final Queue<Pair> queue;

    public TimestampedQueueForStudy() {
        this.queue = new PriorityQueue<>((a, b) -> Double.compare(a.getTimestamp(), b.getTimestamp()));
    }

    public void enqueue(double timestamp, LLCombineResponseForStudy llCombineResponse) {
        this.queue.add(new Pair(timestamp, llCombineResponse));
    }

    public LLCombineResponseForStudy dequeue() {
        return Objects.requireNonNull(this.queue.poll()).getLlCombineResponse();
    }

    public Pair peek() {
        return this.queue.peek();
    }

    public boolean isEmpty() {
        return this.queue.isEmpty();
    }

    public static class Pair {
        private final double timestamp;
        private final LLCombineResponseForStudy llCombineResponse;

        public Pair(double timestamp, LLCombineResponseForStudy llCombineResponse) {
            this.timestamp = timestamp;
            this.llCombineResponse = llCombineResponse;
        }

        public double getTimestamp() {
            return this.timestamp;
        }

        public LLCombineResponseForStudy getLlCombineResponse() {
            return this.llCombineResponse;
        }
    }
}
