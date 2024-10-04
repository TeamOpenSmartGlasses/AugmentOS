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
    private final long DELAY_TIME = 5;
    private final long IGNORE_AFTER_DELAY = 1;

    public final String TAG = "AugmentOS_DisplayQueue";

    public DisplayQueue() {
        this.taskList = new ArrayList<>();
        this.executorService = Executors.newSingleThreadScheduledExecutor();
    }

    public void startQueue() {
        scheduleNextTask(0);
    }

    public void stopQueue() {
        if (currentScheduledTask != null && !currentScheduledTask.isCancelled()) {
            currentScheduledTask.cancel(true);
        }
        executorService.shutdown();
    }

    public void addTask(Task task) {
        if (task.shouldIgnoreIfNotInstant() && !taskList.isEmpty()) {
            return;
        }

        if (taskList.size() >= MAX_QUEUE_SIZE) {
            taskList.remove(0);
        }

        if (task.isTopPriority()) {
            taskList.add(0, task);
        } else {
            taskList.add(task);
        }

        if (taskList.size() == 1 || task.isTopPriority()) {
            scheduleNextTask(0);
        }
    }

    private void scheduleNextTask(long delay) {
        if (executorService == null || executorService.isShutdown() || executorService.isTerminated()) {
            Log.d(TAG, "ExecutorService is shut down or terminated, cannot schedule next task.");
            return;
        }

        if (currentScheduledTask != null && !currentScheduledTask.isCancelled()) {
            currentScheduledTask.cancel(false);
        }

        if (!taskList.isEmpty()) {
            currentScheduledTask = executorService.schedule(this::executeNext, delay, TimeUnit.SECONDS);
        }
    }

    private void executeNext() {
        if (!taskList.isEmpty()) {
            Task task = taskList.get(0);

            if (task.shouldIgnoreIfAfterDelay() && (System.currentTimeMillis() - task.getTimestamp()) > (IGNORE_AFTER_DELAY * 1000)) {
                taskList.remove(0);
                Log.d(TAG, "Task ignored due to delay exceeding threshold.");
                scheduleNextTask(0);
                return;
            }

            taskList.remove(0);
            task.execute();
            scheduleNextTask(DELAY_TIME);
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

    @FunctionalInterface
    public interface Executable {
        void execute();
    }

    public static class Task {
        private final Executable action;
        private final boolean topPriority;
        private final boolean ignoreIfNotInstant;
        private final boolean ignoreIfAfterDelay;
        private final long timestamp;

        public Task(Executable action, boolean topPriority, boolean ignoreIfNotInstant, boolean ignoreIfAfterDelay) {
            this.action = action;
            this.topPriority = topPriority;
            this.ignoreIfNotInstant = ignoreIfNotInstant;
            this.ignoreIfAfterDelay = ignoreIfAfterDelay;
            this.timestamp = System.currentTimeMillis();
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

        public boolean shouldIgnoreIfAfterDelay() {
            return ignoreIfAfterDelay;
        }

        public long getTimestamp() {
            return timestamp;
        }
    }
}
