--  +ve moves image to left
--  -ve value moves image to right
-- +ve shifts y up
-- decrease -ve shifts y  down
-- increase +ve rotation rotates image counter clockwise

use brainsharer;
desc elastix_transformation; 

select *
from elastix_transformation
where FK_prep_id = 'CTB005'
and section in ('149')
order by section;

update elastix_transformation set rotation=0.0159641, xshift=0, yshift=-350 where FK_prep_id = 'CTB005' and section = '146';
update elastix_transformation set rotation=-0.0114995, xshift=40, yshift=180 where FK_prep_id = 'CTB005' and section = '148';
update elastix_transformation set rotation=0.000412516, xshift=-0.020744, yshift=0.22061 where FK_prep_id = 'CTB005' and section = '149';

