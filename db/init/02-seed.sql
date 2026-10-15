USE tonkean;

-- Login: interviewee@tonkean.com / Tonkean2026!
INSERT INTO users (id, email, password_hash, name) VALUES
    ('USR_interviewee', 'interviewee@tonkean.com', '$2b$10$H8azT/D2CyzxQK0/tdPDpuLW2JIhzJPwcB/DSS.R486Q7UYighcfy', 'Interviewee');

INSERT INTO data_sources (id, type, name, config) VALUES
    ('DS_tickets', 'TICKETS', 'Tickets', JSON_OBJECT(
        'baseUrl', 'http://tickets:4200',
        'apiToken', 'tickets-dev-token'
    )),
    ('DS_chatter', 'CHATTER', 'Chatter', JSON_OBJECT(
        'baseUrl', 'http://chatter:4100',
        'apiToken', 'chatter-dev-token'
    ));

-- The backend subscribes this webhook in the ticketing service on boot.
INSERT INTO incoming_webhooks (id, data_source_id, token, signing_secret, status) VALUES
    ('IW_tickets', 'DS_tickets', 'b7c1e0f24a9d4c3e8f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
        '4f9a2c7e1b8d3f6a0c5e9b2d7f1a4c8e6b3d0f5a9c2e7b1d', 'PENDING_CONFIRMATION');

INSERT INTO modules (id, name, is_published, created_by) VALUES
    ('MOD_new_tickets', 'New ticket notification', 1, 'USR_interviewee');

INSERT INTO module_nodes (module_id, id, kind, type, label, data_source_id, config, position_x, position_y) VALUES
    ('MOD_new_tickets', 'trigger', 'TRIGGER', 'TICKET_CREATED', 'When a ticket is created', 'DS_tickets',
        JSON_OBJECT(), 80, 160),
    ('MOD_new_tickets', 'post-message', 'ACTION', 'CHATTER_POST_MESSAGE', 'Post to new_tickets', 'DS_chatter',
        JSON_OBJECT(
            'channel', 'new_tickets',
            'messageTemplate', 'New ticket {{trigger.id}} [{{trigger.priority}}]: {{trigger.title}} (reported by {{trigger.reporter}})'
        ), 420, 160);

INSERT INTO module_edges (module_id, id, source_node_id, target_node_id) VALUES
    ('MOD_new_tickets', 'trigger->post-message', 'trigger', 'post-message');
