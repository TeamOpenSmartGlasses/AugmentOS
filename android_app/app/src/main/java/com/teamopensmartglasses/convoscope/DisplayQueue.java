package com.teamopensmartglasses.convoscope;

import android.util.Log;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

public class DisplayQueue {
    private List<Task> taskList;
    private ScheduledExecutorService executorService;
    private ScheduledFuture<?> currentScheduledTask;

    private final int MAX_QUEUE_SIZE = 5;
    private final long DELAY_TIME = 5; // 5 seconds

    public final String TAG = "AugmentOS_DisplayQueue";

    public DisplayQueue() {
        this.taskList = new ArrayList<>();
        this.executorService = Executors.newSingleThreadScheduledExecutor();
    }

    public void startQueue() {
        scheduleNextTask(0); // Start immediately if the queue has items
    }

    public void stopQueue() {
        if (currentScheduledTask != null && !currentScheduledTask.isCancelled()) {
            currentScheduledTask.cancel(true);
        }
        executorService.shutdown();
    }

    public void addTask(Task task) {
        if (task.shouldIgnoreIfNotInstant() && !taskList.isEmpty()) {
            // Ignore the task if it should be ignored and the list is not empty
            return;
        }

        if (taskList.size() >= MAX_QUEUE_SIZE) {
            // Remove the oldest item (the first item in the list) if the queue is full
            taskList.remove(0);
        }

        if (task.isTopPriority()) {
            // Insert at the beginning of the list
            taskList.add(0, task);
        } else {
            // Add to the end of the list
            taskList.add(task);
        }

        // Schedule the next task immediately if this is the first task or a high-priority task
        if (taskList.size() == 1 || task.isTopPriority()) {
            scheduleNextTask(0);
        }
    }

    private void scheduleNextTask(long delay) {
        // If the executor is shut down or terminated, don't schedule the task
        if (executorService == null || executorService.isShutdown() || executorService.isTerminated()) {
            Log.d(TAG, "ExecutorService is shut down or terminated, cannot schedule next task.");
            return;
        }

        // If there's a task currently scheduled, cancel it
        if (currentScheduledTask != null && !currentScheduledTask.isCancelled()) {
            currentScheduledTask.cancel(false);
        }

        // If there are tasks in the list, schedule the next one
        if (!taskList.isEmpty()) {
            currentScheduledTask = executorService.schedule(this::executeNext, delay, TimeUnit.SECONDS);
        }
    }

    private void executeNext() {
        if (!taskList.isEmpty()) {
            Task task = taskList.remove(0);
            task.execute();
            scheduleNextTask(DELAY_TIME); // Schedule the next task after the current one is executed
        }
    }

    public boolean isEmpty() {
        return taskList.isEmpty();
    }

    public void clear() {
        taskList.clear();
        if (currentScheduledTask != null && !currentScheduledTask.isCancelled()) {
            currentScheduledTask.cancel(true);
        }
    }

    // Functional interface for tasks with parameters
    @FunctionalInterface
    public interface Executable {
        void execute();
    }

    public static class Task {
        private final Executable action;
        private final boolean topPriority;
        private final boolean ignoreIfNotInstant;

        public Task(Executable action, boolean topPriority, boolean ignoreIfNotInstant) {
            this.action = action;
            this.topPriority = topPriority;
            this.ignoreIfNotInstant = ignoreIfNotInstant;
        }

        public void execute() {
            action.execute();
        }

        public boolean isTopPriority() {
            return topPriority;
        }

        public boolean shouldIgnoreIfNotInstant() {
            return ignoreIfNotInstant;
        }
    }
}
