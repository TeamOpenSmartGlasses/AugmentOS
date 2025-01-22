package com.teamopensmartglasses.convoscope;

import java.util.*;
import java.util.concurrent.*;

public class WindowManagerWithTimeouts {
    private static final int DEFAULT_LINGER_TIME = 0; // or any default you want
    private final int globalTimeoutSeconds;
    private long lastGlobalUpdate; // track when *any* layer was last updated

    private final List<Layer> layers = new LinkedList<>();
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    private final Runnable globalTimeoutAction;

    /**
     * @param globalTimeoutSeconds - if no updates for this many seconds, call globalTimeoutAction
     * @param globalTimeoutAction  - what to do when global timeout triggers (e.g. clearScreen)
     */
    public WindowManagerWithTimeouts(int globalTimeoutSeconds, Runnable globalTimeoutAction) {
        this.globalTimeoutSeconds = globalTimeoutSeconds;
        this.globalTimeoutAction = globalTimeoutAction;
        this.lastGlobalUpdate = System.currentTimeMillis();

        // Start a periodic check for timeouts every second (tweak as needed)
        scheduler.scheduleAtFixedRate(this::checkTimeouts, 1, 1, TimeUnit.SECONDS);
    }

    /**
     * Show or update a layer (e.g. an app).
     * @param layerId - unique ID for the app or feature
     * @param displayCommand - code that does the actual display
     * @param lingerTimeSecs - after how many seconds this layer should auto-hide (0 = never)
     */
    public void showAppLayer(String layerId, Runnable displayCommand, int lingerTimeSecs) {
        Layer layer = findLayer(layerId);
        if (layer == null) {
            layer = new Layer(layerId);
            layers.add(layer);
        }
        layer.setDisplayCommand(displayCommand);
        layer.setVisible(true);
        layer.setLastUpdated(System.currentTimeMillis());
        layer.setLingerTimeSeconds(lingerTimeSecs);
        updateGlobalTimestamp();
        updateDisplay();
    }

    public void hideAppLayer(String layerId) {
        Layer layer = findLayer(layerId);
        if (layer != null) {
            layer.setVisible(false);
            updateDisplay();
        }
    }

    /**
     * Dashboard is always on top if visible.
     */
    public void showDashboard(Runnable displayCommand, int lingerTimeSecs) {
        Layer dash = findLayer("DASHBOARD");
        if (dash == null) {
            dash = new Layer("DASHBOARD");
            dash.setAlwaysOnTop(true);
            layers.add(dash);
        }
        dash.setDisplayCommand(displayCommand);
        dash.setVisible(true);
        dash.setLastUpdated(System.currentTimeMillis());
        dash.setLingerTimeSeconds(lingerTimeSecs);
        updateGlobalTimestamp();
        updateDisplay();
    }

    public void hideDashboard() {
        Layer dash = findLayer("DASHBOARD");
        if (dash != null) {
            dash.setVisible(false);
            updateDisplay();
        }
    }

    /**
     * Check if any layer’s lingerTime has passed; if so, hide that layer.
     * Also check for global inactivity.
     */
    private void checkTimeouts() {
        long now = System.currentTimeMillis();

        // Check global timeout
        if ((now - lastGlobalUpdate) >= (globalTimeoutSeconds * 1000L)) {
            // Global inactivity => call the provided global timeout action (e.g. clearScreen)
            globalTimeoutAction.run();
        }

        // Check each layer’s linger
        for (Layer layer : layers) {
            if (layer.isVisible() && layer.getLingerTimeSeconds() > 0) {
                long age = (now - layer.getLastUpdated()) / 1000L;
                if (age >= layer.getLingerTimeSeconds()) {
                    layer.setVisible(false);
                }
            }
        }

        updateDisplay();
    }

    /**
     * Renders whichever layer is on top. If the dashboard is visible, it wins.
     */
    private void updateDisplay() {
        Layer dash = findLayer("DASHBOARD");
        if (dash != null && dash.isVisible()) {
            dash.runCommand();
            return;
        }

        // Otherwise the newest visible layer
        Layer top = layers.stream()
                .filter(Layer::isVisible)
                .max(Comparator.comparingLong(Layer::getLastUpdated))
                .orElse(null);

        if (top != null) {
            top.runCommand();
        } else {
            // No visible layers => could do nothing, or do something like call "clearScreen"
            // globalTimeoutAction.run();   // up to your design
        }
    }

    private Layer findLayer(String layerId) {
        for (Layer layer : layers) {
            if (layer.getId().equals(layerId)) {
                return layer;
            }
        }
        return null;
    }

    private void updateGlobalTimestamp() {
        lastGlobalUpdate = System.currentTimeMillis();
    }

    // Stop the scheduler if needed (e.g. on service destroy).
    public void shutdown() {
        scheduler.shutdownNow();
    }

    //----- Inner class for layers -----
    private static class Layer {
        private final String id;
        private Runnable displayCommand;
        private boolean visible = false;
        private boolean alwaysOnTop = false;
        private long lastUpdated = 0;
        private int lingerTimeSeconds = 0; // 0 = no auto-hide

        public Layer(String id) {
            this.id = id;
        }

        public String getId() { return id; }

        public void setDisplayCommand(Runnable cmd) {
            this.displayCommand = cmd;
        }
        public void runCommand() {
            if (displayCommand != null) {
                displayCommand.run();
            }
        }

        public boolean isVisible() { return visible; }
        public void setVisible(boolean v) { this.visible = v; }
        public boolean isAlwaysOnTop() { return alwaysOnTop; }
        public void setAlwaysOnTop(boolean top) { this.alwaysOnTop = top; }

        public long getLastUpdated() { return lastUpdated; }
        public void setLastUpdated(long timestamp) { this.lastUpdated = timestamp; }

        public int getLingerTimeSeconds() { return lingerTimeSeconds; }
        public void setLingerTimeSeconds(int secs) { this.lingerTimeSeconds = secs; }
    }
}
