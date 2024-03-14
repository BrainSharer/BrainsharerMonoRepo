--  +ve moves image to left
--  -ve value moves image to right
-- +ve shifts y up
-- decrease -ve shifts y  down
-- increase +ve rotation rotates image counter clockwise

use brainsharer;

select *
from neuroglancer_state ns WHERE id = 305;

select au.username, as2.FK_prep_id, br.abbreviation, count(*) as c
from polygon_sequences ps 
inner join annotation_session as2 on ps.FK_session_id = as2.id 
inner join brain_region br on as2.FK_brain_region_id = br.id
inner join auth_user au on as2.FK_user_id = au.id
where 1=1
and as2.FK_prep_id = 'MD589'
and as2.active = 1
and br.abbreviation = 'SC'
group by au.username, as2.FK_prep_id, br.abbreviation
order by au.username, as2.FK_prep_id, br.abbreviation;

select id, LENGTH (neuroglancer_state) as l
from neuroglancer_state ns 
where id = 529
order by l asc;