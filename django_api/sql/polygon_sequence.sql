select as2.id, br.abbreviation , as2.annotation_type , as2.FK_brain_region_id , ps.x, ps.y, ps.z
from polygon_sequences ps 
inner join annotation_session as2 on ps.FK_session_id = as2.id
inner join brain_region br on as2.FK_brain_region_id = br.id 
where as2.FK_prep_id = 'DK109'

and as2.active = 1
and as2.FK_user_id = 1;

update polygon_sequences set x = x/32, y=y/32 where FK_session_id = 7773;