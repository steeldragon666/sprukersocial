INSERT INTO instagram_accounts (username, is_active) 
VALUES ('${INSTAGRAM_USERNAME}', 1)
ON DUPLICATE KEY UPDATE username = VALUES(username);

INSERT INTO automation_settings (setting_key, setting_value) VALUES
('posting_frequency', '15'),
('follow_frequency', '10'),
('max_posts_per_day', '100'),
('max_follows_per_day', '500')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT INTO hashtag_sets (name, hashtags, category, is_active) VALUES
('SAF', '["#SustainableAviationFuel", "#SAF", "#CleanAviation", "#GreenAviation", "#AviationInnovation"]', 'SAF', 1),
('Bioenergy', '["#biofuel", "#biodiesel", "#bioenergy", "#biomass", "#renewablefuels"]', 'Bioenergy', 1),
('Renewables', '["#renewableenergy", "#cleanenergy", "#greenenergy", "#sustainability", "#climateaction"]', 'Renewables', 1)
ON DUPLICATE KEY UPDATE hashtags = VALUES(hashtags);
