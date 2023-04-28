
DROP TABLE IF EXISTS `elastix_transformation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `elastix_transformation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `FK_prep_id` varchar(20) NOT NULL,
  `section` char(3) NOT NULL,
  `rotation` float NOT NULL DEFAULT 0,
  `xshift` float NOT NULL DEFAULT 0,
  `yshift` float NOT NULL DEFAULT 0,
  `metric` float NOT NULL DEFAULT 0,
  `iteration` tinyint(4) NOT NULL DEFAULT 0,
  `created` timestamp NULL DEFAULT current_timestamp(),
  `active` tinyint(4) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK__ET_FK_prep_id_section_iteration` (`FK_prep_id`,`section`,`iteration`),
  KEY `K__ET_FK_prep_id` (`FK_prep_id`),
  CONSTRAINT `FK__ET_FK_prep_id` FOREIGN KEY (`FK_prep_id`) REFERENCES `animal` (`prep_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


INSERT INTO brainsharer.elastix_transformation (id,FK_prep_id,section,rotation,xshift,yshift,metric,iteration,created,active)
SELECT id, prep_id AS FK_prep_id,section,rotation,xshift,yshift,metric,iteration,created,active
FROM active_atlas_production.elastix_transformation;

